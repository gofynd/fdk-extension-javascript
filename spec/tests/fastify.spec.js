'use strict';

const fdkHelper = require("../helpers/fdk");
const { clearData } = require("../helpers/setup_db");
const { SESSION_COOKIE_NAME } = require("../../constants");
const { userHeaders, applicationHeaders, applicationId, applicationToken } = require("./constants");
const request = require('../helpers/fastify_server');
const fastify = require("fastify");

describe("Fastify --> Extension launch flow", () => {
    let webhookConfig = null;
    let cookie = "";
    let queryParams = ""
    let fdk_instance;
    beforeAll(async () => {
        fdk_instance = await fdkHelper.initializeFastifyFDK({
            access_mode: "offline",
            framework: 'fastfy',
            webhook_config: webhookConfig,
            debug: true,
        });

        const apiRoutes = async (fastify, options) => {
            fastify.addHook('preHandler', async (req, res) => {
                try {
                    const companyId = req.headers['x-company-id'] || req.query['company_id'];
                    const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
                    let cookieName = req.cookies[compCookieName] || '';
                    let sessionId = req.unsignCookie(cookieName).value;
                    req.fdkSession = await fdk_instance.middlewares.isAuthorized(sessionId);
                    if (!req.fdkSession) {
                        return res.status(401).json({ "message": "unauthorized" });
                    }
                } catch (error) {
                    throw error
                }
            });

            fastify.get("/api/applications", async (req, res) => {
                return res.send('My extension routes');
            });
        };

        const applicationProxyRoutes = async (fastify, options) => {
            fastify.register(fdk_instance.applicationProxyRoutes);

            fastify.get('/app/applications', async function (req, res, next) {
                return res.status(200).send({ user_id: req.user.user_id })
            });
        };


        request.app.register(fdk_instance.fdkHandler);
        request.app.register(apiRoutes);
        request.app.register(applicationProxyRoutes);
        await request.app.listen({ port: 5001 });
    });

    afterAll(async () => {
        await clearData();
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

    it('/fp/auto_install', async () => {
        let response = await request
            .post(`/fp/auto_install`)
            .send({ company_id: 1 });
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

    it('Online mode: /fp/install should return redirect url', async () => {
        const app1 = fastify();
        let online_fdk_instance = await fdkHelper.initializeFastifyFDK({
            access_mode: "online",
            webhook_config: webhookConfig,
            debug: true,
        });
        app1.register(online_fdk_instance.fdkHandler);


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

});