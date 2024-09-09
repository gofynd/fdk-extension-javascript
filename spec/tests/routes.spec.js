'use strict';

const fdkHelper = require("../helpers/fdk");
const axiosMock = require("./../mocks/axios.mock.js");
const { clearData } = require("../helpers/setup_db");
const request = require("../helpers/server");
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require("../../lib/constants");
const { userHeaders, applicationHeaders, applicationId, applicationToken } = require("./constants");

describe("Extension launch flow", () => {
    let cookie = "";
    let admCookie = "";
    let admQueryParams = ""
    let queryParams = ""
    let fdk_instance;
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
        axiosMock.reset();
    });

    it('/fp/install should return redirect url', async () => {
        let response = await request
            .get('/fp/install?company_id=1&install_event=true')
            .send();
        cookie = response.headers['set-cookie'][0].split(",")[0].split("=")[1];
        queryParams = response.headers['location'].split('?')[1];
        expect(response.status).toBe(302);
    });

    it('/fp/auth should return redirect url', async () => {
        let response = await request
            .get(`/fp/auth?company_id=1&install_event=true&${queryParams}`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .send();
        expect(response.status).toBe(302);
    });

    it('Session middleware should get called on apiRoutes', async () => {
        let response = await request
            .get('/api/applications')
            .set('x-company-id', 1)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .send();
        expect(response.status).toBe(200);
    });

    it('Session middleware should return unauthorized when session not found', async () => {
        let response = await request
            .get('/api/applications')
            .set('x-company-id', 2)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .send();
        expect(response.status).toBe(401);
    });

    it('Should set user and application configs in request object while using applicationProxyroutes', async () => {
        let response = await request
            .get('/app/applications')
            .set('x-company-id', 1)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
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

    it('/fp/install redirect url should contains application id', async () => {
        let response = await request
            .get(`/fp/install?company_id=1&install_event=true&application_id=${applicationId}`)
            .send();
        let redirectUrl = response.headers['location'].split('?')[1];
        expect(redirectUrl).toContain('application_id');
        expect(response.status).toBe(302);
    });

    it('/fp/auth Shoudld thorw error on missing fdk session', async () => {
        let response = await request
            .get(`/fp/auth?company_id=2&install_event=true&${queryParams}`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .send();
        expect(response.status).toBe(500);
    });

    it('/fp/auth Should throw error on invalid fdk state', async () => {
        let response = await request
            .get(`/fp/auth?company_id=1&install_event=true&${queryParams}&state=12345`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
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
        
        admCookie = response.headers['set-cookie'][0].split(",")[0].split("=")[1];
        admQueryParams = response.headers['location'].split('?')[1];
        console.log(admQueryParams)
        expect(response.status).toBe(302);
    });
    
    it('/adm/auth should return redirect url', async () => {
        let response = await request
            .get(`/adm/auth?organization_id=1&install_event=true&${admQueryParams}`)
            .set('cookie', `${ADMIN_SESSION_COOKIE_NAME}=${admCookie}`)
            .send();
        expect(response.status).toBe(302);
    });
    
    it('Should return PartnerClient in offline mode', async () => {
        const client = await fdk_instance.getPartnerClient(1);
        expect(client).toBeDefined();
    });
    
    it('Partner session middleware should return unauthorized when session not found', async () => {
        let response = await request
            .get('/partner/theme')
            .set('cookie', `${ADMIN_SESSION_COOKIE_NAME}=anc`)
            .send();
        expect(response.status).toBe(401);
    });
    
    it('Partner session middleware should get called on apiRoutes', async () => {
        let response = await request
            .get('/partner/theme')
            .set('cookie', `${ADMIN_SESSION_COOKIE_NAME}=${admCookie}`)
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
        cookie = response.headers['set-cookie'][0].split(",")[0].split("=")[1];
        queryParams = response.headers['location'].split('?')[1];
        expect(response.status).toBe(302);
    });

    it('Online mode:/fp/auth should return redirect url', async () => {
        let response = await request
            .get(`/fp/auth?company_id=1&install_event=true&${queryParams}`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .send();
        expect(response.status).toBe(302);
    });

    it('Should return PlatformClient in online mode', async () => {
        const client = await fdk_instance.getPlatformClient(1, fdkHelper.getSession());
        expect(client).toBeDefined();
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
        admCookie = response.headers['set-cookie'][0].split(",")[0].split("=")[1];
        admQueryParams = response.headers['location'].split('?')[1];
        expect(response.status).toBe(302);
    });

    it('Online mode:/adm/auth should return redirect url', async () => {
        let response = await request
            .get(`/adm/auth?organization_id=1&install_event=true&${admQueryParams}`)
            .set('cookie', `${ADMIN_SESSION_COOKIE_NAME}=${admCookie}`)
            .send();
        expect(response.status).toBe(302);
    });

    it('Should return PartnerClient in online mode', async () => {
        const client = await fdk_instance.getPartnerClient(1, fdkHelper.getSession());
        expect(client).toBeDefined();
    });
});