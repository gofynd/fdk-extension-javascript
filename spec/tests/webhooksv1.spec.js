'use strict';

const fdkHelper = require("../helpers/fdk");
const { clearData } = require("../helpers/setup_db");
const request = require("../helpers/server");
const axiosMock = require("./../mocks/axiosv1.mock.js");
const { SESSION_COOKIE_NAME } = require("../../lib/constants");
const hmacSHA256 = require("crypto-js/hmac-sha256");

function getSignature(body) {
    return hmacSHA256(JSON.stringify(body), 'API_SECRET')
}

describe("Webhook Integrations for v1", () => {
    let webhookConfig = null;
    let cookie = "";
    let fdk_instance = null;
    beforeAll(async () => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 99999
        webhookConfig = {
            api_path: '/v1/webhooksv1',
            notification_email: 'testmanish@abc.com',
            subscribed_saleschannel: 'specific',
            event_map: {
                'company/product/create': {
                    version: '1',
                    handler: function () { },
                    provider: 'rest'
                },
                'application/coupon/create': {
                    version: '1',
                    handler: function () { throw Error('test error3') },
                    provider: 'rest'
                }
            }
        }
        fdk_instance = await fdkHelper.initializeFDK({
            access_mode: "offline",
            debug: true,
            webhook_config: webhookConfig
        });
        request.app.restApp.use(fdk_instance.fdkHandler);
        request.app.restApp.post('/v1/webhooksv1', async (req, res, next)=>{
            let status = 404;
            try {
                await fdk_instance.webhookRegistry.processWebhook(req);
                status = 200;
            }
            catch(err) {
                status = 500;
            }
            return res.status(status).json({"success": status === 200});
        });
        
        let response = await request
            .get('/fp/install?company_id=1&install_event=true')
            .send();
        expect(response.status).toBe(302);
        cookie = response.headers['set-cookie'][0].split(",")[0].split("=")[1];
        const queryParams = response.headers['location'].split('?')[1];
        response = await request
            .get(`/fp/auth?company_id=1&install_event=true&${queryParams}`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .send();
        expect(response.status).toBe(302);
    });

    afterAll(async () => {
        await clearData();
        fdk_instance.extension._isInitialized = false;
    });

    afterAll(() => {
        axiosMock.reset();
        request.app.shutdown();
    });

    it("Register webhooks", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "product", "type": "create", "category": "company", "version": '1'} };
        const res = await request
            .post(`/v1/webhooksv1`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(200);
        expect(res.body.success).toBeTrue();
    });

    it("Invalid webhook path", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "coupon", "type": "update", "category": "application", "version": '1'} };
        const res = await request
            .post(`/v1/webhooksv1`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(500);
    });

    it("Failed webhook handler execution", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "coupon", "type": "create", "category": "application", "version": '1'} };
        const res = await request
            .post(`/v1/webhooksv1`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
            .set('x-fp-signature', getSignature(reqBody))
            .send(reqBody);
        expect(res.status).toBe(500);
        expect(res.body.success).toBeFalse();
    });

    it("Sync webhooks: Add new", async () => {
        const reqBody = { "company_id": 1, "payload": { "test": true }, "event": {"name": "coupon", "type": "create", "category": "application", "version": '1'} };
        const newMap = {
            api_path: '/v1/webhooksv1',
            notification_email: 'test@abc.com',
            event_map: {
                'company/product/create': {
                    version: '1',
                    handler: function () { },
                    provider: 'rest'
                },
                'application/coupon/create': {
                    version: '1',
                    handler: function () { 
                        return true;
                    }
                }
            }
        }
        const handlerFn = spyOn(newMap.event_map['application/coupon/create'], 'handler');
        const platformClient = await fdk_instance.getPlatformClient('1');
        await fdk_instance.webhookRegistry.syncEvents(platformClient, newMap);
        const res = await request
            .post(`/v1/webhooksv1`)
            .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
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