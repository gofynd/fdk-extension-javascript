const { extension } = require("./extension");
const Session = require("./session/session");
const SessionStorage = require("./session/session_storage");
const { ApplicationConfig, ApplicationClient } = require("@gofynd/fdk-client-javascript");
async function getPlatformClient(companyId, sessionId) {
    let client = null;
    let sid = sessionId;
    if (!extension.isOnlineAccessMode()) {
        sid = Session.generateSessionId(false, {
            cluster: extension.cluster,
            companyId: companyId
        });
    }
    let session = await SessionStorage.getSession(sid);
    client = await extension.getPlatformClient(companyId, session);
    return client;
}
async function getApplicationClient(applicationId, applicationToken) {
    let applicationConfig = new ApplicationConfig({
        applicationID: applicationId,
        applicationToken: applicationToken,
        domain: extension.cluster
    });
    let applicationClient = new ApplicationClient(applicationConfig);
    return applicationClient;
}
function formRequestObject(req) {
    return {
        body: req.body,
        query: req.query,
        headers: req.headers,
        extension: req === null || req === void 0 ? void 0 : req.extension,
        fdkSession: req === null || req === void 0 ? void 0 : req.fdkSession,
        signedCookies: req.signedCookies,
        params: req.params
    };
}
module.exports = {
    formRequestObject,
    getPlatformClient,
    getApplicationClient
};
//# sourceMappingURL=utils.js.map