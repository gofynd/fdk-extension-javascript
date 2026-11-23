'use strict';

const MockAdapter = require('axios-mock-adapter');
const { FdkAxios } = require('@gofynd/fdk-client-javascript');
const { extension } = require("../../express/extension");
const { MemoryStorage } = require("../../express/storage");

const CLUSTER_URL = "http://localdev.fyndx0.de";
const extension_details_url = `${CLUSTER_URL}/service/panel/partners/v1.0/extensions/details/API_KEY`;

function getBaseConfig(overrides) {
    return {
        api_key: "API_KEY",
        api_secret: "API_SECRET",
        base_url: "http://localdev.fyndx0.de",
        callbacks: {
            auth: () => {},
            uninstall: () => {}
        },
        storage: new MemoryStorage("test_fdk_ext"),
        access_mode: "online",
        cluster: CLUSTER_URL,
        ...overrides
    };
}

describe("Extension base_url sync", () => {
    let mock;

    beforeEach(() => {
        extension._isInitialized = false;
        mock = new MockAdapter(FdkAxios);
        mock.onGet(extension_details_url).reply(200, {
            "extension_name": "Test extension",
            "base_url": "http://ab.test.com",
            "scope": ["company/products"]
        });
        mock.onPatch(extension_details_url).reply(200, {
            "message": "Updated successfully"
        });
    });

    afterEach(() => {
        mock.restore();
    });

    afterAll(() => {
        // Reset so subsequent specs (webhooks) can reinitialize the singleton
        extension._isInitialized = false;
    });

    it("should sync local base_url to platform when it differs from remote", async () => {
        await extension.initialize(getBaseConfig());

        expect(mock.history.patch.length).toBe(1);
        const patchBody = JSON.parse(mock.history.patch[0].data);
        expect(patchBody.base_url).toBe("http://localdev.fyndx0.de");
    });

    it("should not sync base_url when local matches remote", async () => {
        await extension.initialize(getBaseConfig({ base_url: "http://ab.test.com" }));

        expect(mock.history.patch.length).toBe(0);
    });

    it("should use platform base_url when local is not provided", async () => {
        await extension.initialize(getBaseConfig({ base_url: undefined }));

        expect(mock.history.patch.length).toBe(0);
        expect(extension.base_url).toBe("http://ab.test.com");
    });

    it("should not fail initialization if base_url sync fails", async () => {
        mock.onPatch(extension_details_url).reply(500, { message: "Internal Server Error" });

        await extension.initialize(getBaseConfig());

        expect(extension.base_url).toBe("http://localdev.fyndx0.de");
    });

    it("should always use platform scopes and ignore local scopes config", async () => {
        await extension.initialize(getBaseConfig({ scopes: ["company/saleschannel"] }));

        expect(extension.scopes).toEqual(["company/products"]);
    });

    it("should use platform scopes when scopes not provided", async () => {
        await extension.initialize(getBaseConfig());

        expect(extension.scopes).toEqual(["company/products"]);
    });

    it("should not break when invalid scopes are passed locally", async () => {
        await extension.initialize(getBaseConfig({ scopes: ["invalid/scope"] }));

        expect(extension.scopes).toEqual(["company/products"]);
    });
});
