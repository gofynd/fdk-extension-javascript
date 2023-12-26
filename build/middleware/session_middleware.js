'use strict';
const SessionStorage = require("../session/session_storage");
const { ApplicationConfig, ApplicationClient } = require("@gofynd/fdk-client-javascript");
const { SESSION_COOKIE_NAME } = require('../constants');
function sessionMiddleware(strict) {
    return async (req, res, next) => {
        try {
            const companyId = req.headers['x-company-id'] || req.query['company_id'];
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await isAuthorized(sessionId, strict);
            if (!req.fdkSession) {
                return res.status(401).json({ "message": "unauthorized" });
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
async function isAuthorized(session_id) {
    let fdkSession = await SessionStorage.getSession(session_id);
    if (!fdkSession) {
        return false;
    }
    return fdkSession;
}
async function getApplicationConfig(userData, applicationData, extension) {
    let user, application, applicationConfig, applicationClient;
    if (userData) {
        user = JSON.parse(userData);
        user.user_id = user._id;
    }
    if (applicationData) {
        application = JSON.parse(applicationData);
        applicationConfig = new ApplicationConfig({
            applicationID: application._id,
            applicationToken: application.token,
            domain: extension.cluster
        });
        applicationClient = new ApplicationClient(applicationConfig);
    }
    return {
        user,
        application,
        applicationConfig,
        applicationClient
    };
}
;
module.exports = {
    isAuthorized: isAuthorized,
    sessionMiddleware: sessionMiddleware,
    getApplicationConfig: getApplicationConfig
};
//# sourceMappingURL=session_middleware.js.map