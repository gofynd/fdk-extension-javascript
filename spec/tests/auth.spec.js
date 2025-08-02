'use strict';

const fdkHelper = require("../helpers/fdk");
const { clearData, getOfflineSession, saveOfflineSession } = require("../helpers/setup_db");
const request = require("../helpers/server")(5073);
const axiosMock = require("./../mocks/axios.mock.js");
const { SESSION_COOKIE_NAME } = require("../../express/constants");
const { extension } = require("../../express/extension");
const Session = require("../../express/session/session");
const SessionStorage = require("../../express/session/session_storage");
const jwt = require('jsonwebtoken');

describe("Auth Integrations", () => {
    let fdk_instance;
    let cookie = "";

    beforeEach(async () => {
        fdk_instance = await fdkHelper({
            access_mode: "online",
            callbacks: {
                auth: async (req) => {
                    return "http://localdev.fyndx0.de/test-page";
                },
                uninstall: async (req) => {},
            }
        });
        request.app.restApp.use(fdk_instance.fdkHandler);
    });

    afterEach(async () => {
        await clearData();
        fdk_instance.extension._isInitialized = false;
    });

    afterAll(() => {
        axiosMock.reset();
        request.app.shutdown();
    });

    it("should redirect to auth url for new install", async () => {
        const response = await request.get('/fp/install?company_id=1');
        expect(response.status).toBe(302);

        const location = response.headers['location'];
        expect(location).toContain("/service/panel/authentication/v1.0/company/1/oauth/authorize");

        const cookieHeader = response.headers['set-cookie'][0];
        const cookieValue = cookieHeader.split(';')[0].split('=')[1];

        const decoded = jwt.verify(cookieValue, 'API_SECRET');
        expect(decoded.id).toBeDefined();
    });

    it("should reuse existing session and redirect to auth callback", async () => {
        // 1. Create a valid session
        const companyId = 1;
        const sessionId = "test_session_id";
        const session = new Session(sessionId, false);
        session.company_id = companyId;
        session.scope = ["company/products"];
        session.expires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes from now
        session.access_token = "test_access_token";
        session.access_mode = "online";
        session.extension_id = "API_KEY";

        await SessionStorage.saveSession(session);

        // 2. Create a JWT for the session
        const jwtToken = jwt.sign({ id: sessionId }, 'API_SECRET', { expiresIn: '15m' });

        // 3. Make a request with the JWT cookie
        const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
        const response = await request.get(`/fp/install?company_id=${companyId}`)
            .set('Cookie', `${compCookieName}=${jwtToken}`);

        // 4. Assert the redirect
        expect(response.status).toBe(302);
        const location = response.headers['location'];
        expect(location).toBe("http://localdev.fyndx0.de/test-page"); // Should redirect to the auth callback directly
    });
});
