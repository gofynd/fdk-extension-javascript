'use strict';

const fdkHelper = require("../helpers/fdk");
const { clearData } = require("../helpers/setup_db");
const request = require("../helpers/server");
const hmacSHA256 = require("crypto-js/hmac-sha256");
const url = require('url');
const { userHeaders, applicationHeaders, applicationId, applicationToken } = require("./constants");

function getSignature(body) {
    return hmacSHA256(JSON.stringify(body), 'API_SECRET')
}

describe("Webhook Integrations", () => {
    let webhookConfig = null;
    let jwtToken = "";
    beforeAll(async () => {
        webhookConfig = {
            api_path: '/v1/webhooks',
            notification_email: 'test@abc.com',
            event_map: {
                'company/product/create': {
                    version: '1',
                    handler: function () { }
                },
                'application/coupon/create': {
                    version: '1',
                    handler: function () { throw Error('test error') }
                }
            }
        }
        this.fdk_instance = await fdkHelper.initializeFDK({
            access_mode: "offline",
            webhook_config: webhookConfig
        });
        request.app.restApp.use(this.fdk_instance.fdkHandler);
        request.app.restApp.post('/v1/webhooks', async (req, res, next)=>{
            let status = 404;
            try {
                await this.fdk_instance.webhookRegistry.processWebhook(req);
                status = 200;
            }
            catch(err) {
                console.log(err);
                status = 500;
            }
            return res.status(status).json({"success": status === 200});
        });
        
        let response = await request
            .get('/fp/install?company_id=1&install_event=true')
            .send();
        expect(response.status).toBe(302);
        const uri = url.parse(response.headers['location'], true);
        const token = url.parse(uri.query.redirect_uri, true).query.token;
        response = await request
            .get(`/fp/auth?company_id=1&install_event=true&state=${uri.query.state}&token=${token}`)
            .send();
        expect(response.status).toBe(302);
        response = await request
            .get(`/fp/get_session_token?token`)
            .set({
                authorization:token
            })
            .send();
        expect(response.status).toBe(200);
        jwtToken = response.body.token;
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
        await clearData();
    });

    it("Register webhooks", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "product", "type": "create", "category": "company"} };
        const res = await request
            .post(`/v1/webhooks`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(200);
        expect(res.body.success).toBeTrue();
    });

    it("Invalid webhook path", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "coupon", "type": "update", "category": "application"} };
        const res = await request
            .post(`/v1/webhooks`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(500);
    });

    it("Failed webhook handler execution", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "coupon", "type": "create", "category": "application"} };
        const res = await request
            .post(`/v1/webhooks`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(500);
        expect(res.body.success).toBeFalse();
    });

    it("Sync webhooks: Add new", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "coupon", "type": "create", "category": "application"} };
        const newMap = {
            api_path: '/v1/webhooks',
            notification_email: 'test@abc.com',
            event_map: {
                'application/coupon/create': {
                    version: '1',
                    handler: function () { }
                }
            }
        }
        const handlerFn = spyOn(newMap.event_map['application/coupon/create'], 'handler');
        const platformClient = await this.fdk_instance.getPlatformClient('1');
        await this.fdk_instance.webhookRegistry.syncEvents(platformClient, newMap);
        const res = await request
            .post(`/v1/webhooks`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(200);
        expect(handlerFn).toHaveBeenCalled();
    });

    // it("Sync webhooks: Replace existing", async () => {

    //     const res = await request
    //         .post(`/fp/webhook/test-wbhk-fail`)
    //         .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
    //         .send({ "company_id": 1, "payload": { "test": true } });
    //     expect(res.status).toBe(500);
    //     expect(res.body.success).toBeFalse();
    // });
});

describe("Extension launch flow", () => {
    let fdk_instance;
    let jwtToken = "";
    let redirectURL = "";
    let tempToken = "";
    let amdJwtToken = "";
    let amdRedirectURL = "";
    let amdTempToken = "";
    beforeAll(async () => {
        fdk_instance = await fdkHelper.initializeFDK({
            access_mode: "offline",
            debug: true,
        });
        request.app.restApp.use(fdk_instance.fdkHandler);
        let apiRouter = request.app.express.Router();
        let applicationRouter = request.app.express.Router();

        let apiRoutes = fdk_instance.apiRoutes;
        let applicationProxyRoutes = fdk_instance.applicationProxyRoutes;
        let partnerApiRoutes = fdk_instance.partnerApiRoutes;
        
        apiRouter.use('/api/*', apiRoutes);
        apiRouter.get('/api/applications', async function view(req, res, next) {
            return res.send('My extension routes');
        });
        applicationRouter.get('/applications', async function (req, res, next) {
            return res.status(200).json({ user_id: req.user.user_id })
        });
        
        partnerApiRoutes.get('/theme', async function (req, res, next) {
            return res.send('My partner side extension routes');
        });

        applicationProxyRoutes.use('/app', applicationRouter);
        request.app.restApp.use(apiRouter);
        request.app.restApp.use(applicationProxyRoutes);
        request.app.restApp.use('/partner',partnerApiRoutes);
    });

    afterAll(async () => {
        await clearData();
    });

    it('/fp/install should return redirect url', async () => {
        let response = await request
            .get('/fp/install?company_id=1&install_event=true')
            .send();
        redirectURL = response.headers['location'];
        expect(response.status).toBe(302);
    });

    it('/fp/auth should return redirect url', async () => {
        const uri = url.parse(redirectURL, true);
        tempToken = url.parse(uri.query.redirect_uri, true).query.token;
        let response = await request
            .get(`/fp/auth?company_id=1&install_event=true&state=${uri.query.state}&token=${tempToken}`)
            .send();
        expect(response.status).toBe(302);
    });
    
    it('/fp/get_session_token should return jwt token', async () => {
        let response = await request
            .get(`/fp/get_session_token`)
            .set({
                authorization:tempToken
            })
            .send();
        expect(response.status).toBe(200);
        jwtToken = response.body.token;
    });
    
    
    it('Session middleware should get called on apiRoutes', async () => {
        let response = await request
            .get('/api/applications')
            .set({
                authorization:jwtToken
            })
            .send();
        expect(response.status).toBe(200);
    });

    it('Session middleware should return unauthorized when session not found', async () => {
        let response = await request
            .get('/api/applications')
            .set({
                authorization:'token not found'
            })
            .send();
        expect(response.status).toBe(401);
    });

    it('Should set user and application configs in request object while using applicationProxyroutes', async () => {
        let response = await request
            .get('/app/applications')
            .set(userHeaders)
            .set(applicationHeaders)
            .send();
        expect(response.status).toBe(200);
        expect(response.body.user_id).toBe('5e199e6998cfe1776f1385dc');
    });

    it('Should return PlatformClient in offline mode', async () => {
        const client = await fdk_instance.getPlatformClient(1);
        expect(client).toBeDefined();
    });

    it('Should return ApplicationClient in offline mode', async () => {
        const client = await fdk_instance.getApplicationClient(applicationId, applicationToken);
        expect(client.cart).toBeDefined();
    });

    it('/fp/auto_install', async () => {
        let response = await request
            .post(`/fp/auto_install`)
            .send({ company_id: 1 })
            .set({
                authorization:jwtToken
            });
        expect(response.status).toBe(200);
    });

    it('/fp/install redirect url should contains application id', async () => {
        let response = await request
            .get(`/fp/install?company_id=1&install_event=true&application_id=${applicationId}`)
            .send();
        let redirectUrl = response.headers['location'].split('?')[1];
        expect(redirectUrl).toContain('application_id');
        expect(response.status).toBe(302);
    });

    it('/fp/auth Should thorw error on missing fdk session', async () => {
        const uri = url.parse(redirectURL, true);
        tempToken = url.parse(uri.query.redirect_uri, true).query.token;
        let response = await request
            .get(`/fp/auth?company_id=1&install_event=true&state=${uri.query.state}&token=${tempToken}`)
            .send();
        expect(response.status).toBe(500);
    });

    it('/fp/auth Should throw error on invalid fdk state', async () => {
        let response = await request
            .get(`/fp/auth?company_id=1&install_event=true&&state=12345&token=${tempToken}`)
            .send();
        expect(response.status).toBe(500);
    });

    it('/fp/uninstall', async () => {
        let response = await request
            .post('/fp/uninstall')
            .send({ company_id: 1 });
        expect(response.status).toBe(200);
    });
    
    it('/adm/install should return redirect url', async () => {
        let response = await request
            .get('/adm/install?organization_id=1&install_event=true')
            .send();
        amdRedirectURL = response.headers['location'];
        expect(response.status).toBe(302);
    });
    
    it('/adm/auth should return redirect url', async () => {
        const uri = url.parse(amdRedirectURL, true);
        amdTempToken = url.parse(uri.query.redirect_uri, true).query.token;
        let response = await request
            .get(`/adm/auth?organization_id=1&install_event=true&state=${uri.query.state}&token=${amdTempToken}`)
            .send();
        expect(response.status).toBe(302);
    });
    
    it('Partner session middleware should return unauthorized when session not found', async () => {
        let response = await request
            .get('/partner/theme')
            .send();
        expect(response.status).toBe(401);
    });
    
    it('/fp/get_session_token should return jwt token for admin routes', async () => {
        let response = await request
            .get(`/fp/get_session_token`)
            .set({
                authorization:amdTempToken
            })
            .send();
        expect(response.status).toBe(200);
        amdJwtToken = response.body.token;
    });
    
    it('Partner session middleware should get called on apiRoutes', async () => {
        let response = await request
            .get('/partner/theme')
            .set({
                authorization:amdJwtToken
            })
            .send();
        expect(response.status).toBe(200);
    });
    
    it('Online mode: /fp/install should return redirect url', async () => {
        let online_fdk_instance = await fdkHelper.initializeFDK({
            access_mode: "online",
            debug: true,
        });
        request.app.restApp.use(online_fdk_instance.fdkHandler);

        let response = await request
            .get('/fp/install?company_id=1&install_event=true')
            .send();
        redirectURL = response.headers['location'];
        expect(response.status).toBe(302);
    });

    it('Online mode:/fp/auth should return redirect url', async () => {
        const uri = url.parse(redirectURL, true);
        tempToken = url.parse(uri.query.redirect_uri, true).query.token;
        let response = await request
        .get(`/fp/auth?company_id=1&install_event=true&state=${uri.query.state}&token=${tempToken}`)
            .send();
        expect(response.status).toBe(302);
    });
    
    it('Online mode: /adm/install should return redirect url', async () => {
        let online_fdk_instance = await fdkHelper.initializeFDK({
            access_mode: "online",
            debug: true,
        });
        request.app.restApp.use(online_fdk_instance.fdkHandler);

        let response = await request
            .get('/adm/install?organization_id=1&install_event=true')
            .send();
        amdRedirectURL = response.headers['location'];
        expect(response.status).toBe(302);
    });

    it('Online mode:/adm/auth should return redirect url', async () => {
        const uri = url.parse(amdRedirectURL, true);
        amdTempToken = url.parse(uri.query.redirect_uri, true).query.token;
        let response = await request
            .get(`/adm/auth?organization_id=1&install_event=true&state=${uri.query.state}&token=${amdTempToken}`)
            .send();
        expect(response.status).toBe(302);
    });
});