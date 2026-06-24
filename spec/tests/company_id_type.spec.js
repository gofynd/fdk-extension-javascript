'use strict';

const fdkHelper = require("../helpers/fdk");
const { clearData } = require("../helpers/setup_db");
const request = require("../helpers/server")(5073);
require("./../mocks/axios.mock.js");
const SessionStorage = require("../../express/session/session_storage");

describe("Company id type consistency", () => {
    let originalSaveSession;
    let saveSessionSpy;

    beforeEach(async () => {
        originalSaveSession = SessionStorage.saveSession;
        saveSessionSpy = spyOn(SessionStorage, 'saveSession').and.callThrough();
    });

    afterEach(async () => {
        SessionStorage.saveSession = originalSaveSession;
        await clearData();
        if (this.fdk_instance) {
            this.fdk_instance.extension._isInitialized = false;
        }
    });

    afterAll(() => {
        request.app.shutdown();
    });

    it("stores company_id as number from fp install", async () => {
        this.fdk_instance = await fdkHelper({
            access_mode: "online"
        });
        request.app.restApp.use(this.fdk_instance.fdkHandler);

        const response = await request
            .get('/fp/install?company_id=1')
            .send();

        expect(response.status).toBe(302);
        const savedSession = saveSessionSpy.calls.mostRecent().args[0];
        expect(savedSession.company_id).toBe(1);
        expect(typeof savedSession.company_id).toBe('number');
    });

    it("stores company_id as number from fp auto install", async () => {
        this.fdk_instance = await fdkHelper({
            access_mode: "offline"
        });
        request.app.restApp.use(this.fdk_instance.fdkHandler);

        const response = await request
            .post('/fp/auto_install')
            .send({
                company_id: "1",
                code: "test-code"
            });

        expect(response.status).toBe(200);
        const savedSession = saveSessionSpy.calls.mostRecent().args[0];
        expect(savedSession.company_id).toBe(1);
        expect(typeof savedSession.company_id).toBe('number');
    });
});
