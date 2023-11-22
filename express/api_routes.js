'use strict';
const express = require('express');
const { sessionMiddleware } = require('./middleware/session_middleware');
const { ApplicationConfig, ApplicationClient } = require("@gofynd/fdk-client-javascript");


function setupProxyRoutes(extension) {
    const apiRoutes = express.Router({  mergeParams: true });
    const applicationProxyRoutes = express.Router({  mergeParams: true });

    applicationProxyRoutes.use(["/", "/:cluster_id"],async (req, res, next) => {
        try {
            const clusterId = req.params.cluster_id;
            if (clusterId) {
                extension = ExtensionFactory.getExtension(clusterId)
            }
            if(req.headers["x-user-data"]) {
                req.user = JSON.parse(req.headers["x-user-data"]);
                req.user.user_id = req.user._id;
            }
            if(req.headers["x-application-data"]) {
                req.application = JSON.parse(req.headers["x-application-data"]);
                req.applicationConfig = new ApplicationConfig({
                    applicationID: req.application._id,
                    applicationToken: req.application.token,
                    domain: extension.cluster
                });
                req.applicationClient = new ApplicationClient(req.applicationConfig);
            }
            next();
        } catch (error) {
            next(error);
        }
    });
    
    apiRoutes.use(["/", "/:cluster_id"], sessionMiddleware(extension, true), async (req, res, next) => {
        try {
            const clusterId = req.params.cluster_id;
            if (clusterId) {
                extension = ExtensionFactory.getExtension(clusterId)
            }
            const client = await extension.getPlatformClient(req.fdkSession.company_id, req.fdkSession);
            req.platformClient = client;
            req.extension = extension;
            next();
        } catch (error) {
            next(error);
        }
    });
    
    return {
        platformApiRoutes: apiRoutes,
        apiRoutes: apiRoutes, // this is deprecated use platformApiRoutes
        applicationProxyRoutes: applicationProxyRoutes
    };
}

module.exports = {
    setupProxyRoutes: setupProxyRoutes
};