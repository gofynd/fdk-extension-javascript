'use strict';
const { extension } = require('../extension');
const express = require('express');
const { sessionMiddleware } = require('../middleware/session_middleware');
const { getApplicationConfig, getUserData } = require('../utils');
function setupProxyRoutes() {
    const apiRoutes = express.Router({ mergeParams: true });
    const applicationProxyRoutes = express.Router({ mergeParams: true });
    applicationProxyRoutes.use(async (req, res, next) => {
        try {
            const user = await getUserData(req.headers["x-user-data"]);
            const { application, applicationConfig, applicationClient } = await getApplicationConfig(req.headers["x-application-data"], extension);
            req.user = user;
            req.application = application;
            req.applicationConfig = applicationConfig;
            req.applicationClient = applicationClient;
            next();
        }
        catch (error) {
            next(error);
        }
    });
    apiRoutes.use(sessionMiddleware(true), async (req, res, next) => {
        try {
            const client = await extension.getPlatformClient(req.fdkSession.company_id, req.fdkSession);
            req.platformClient = client;
            req.extension = extension;
            next();
        }
        catch (error) {
            next(error);
        }
    });
    return {
        platformApiRoutes: apiRoutes,
        apiRoutes: apiRoutes,
        applicationProxyRoutes: applicationProxyRoutes
    };
}
module.exports = {
    setupProxyRoutes: setupProxyRoutes
};
//# sourceMappingURL=api_routes.js.map