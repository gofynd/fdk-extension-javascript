'use strict';
const { extension } = require('./extension');
const express = require('express');
const { sessionMiddleware, partnerSessionMiddleware, verifySignature } = require('./middleware/session_middleware');
const { ApplicationConfig, ApplicationClient } = require("@gofynd/fdk-client-javascript");
const { FdkInvalidHMacError, FdkRequestTimeoutError } = require("./error_code");


function setupProxyRoutes(configData) {
    const apiRoutes = express.Router({ mergeParams: true });
    const applicationProxyRoutes = express.Router({ mergeParams: true });
    const partnerApiRoutes = express.Router({ mergeParams: true });

    applicationProxyRoutes.use(async (req, res, next) => {
        try {
            if (req.headers["x-fp-signature"]) {
                if(!verifySignature(req, configData.api_secret)) {
                    throw new FdkInvalidHMacError(`Signature passed does not match calculated body signature`);
                } else{
                    const allowedTimeWindow = 1000; // 1 second
                    const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds
                    const requestTimestamp = body.timestamp; // Ensure the timestamp is part of the request body
                    if (!requestTimestamp || Math.abs(currentTimestamp - requestTimestamp) > allowedTimeWindow) {
                        console.error("Timestamp verification failed");
                        throw new FdkRequestTimeoutError(`Request took too long to process`);
                    }
                }
            } else{
                throw new Error("Signature not found in request");
            }

            if (req.headers["x-user-data"]) {
                req.user = JSON.parse(req.headers["x-user-data"]);
                req.user.user_id = req.user._id;
            }
            if (req.headers["x-application-data"]) {
                req.application = JSON.parse(req.headers["x-application-data"]);
                req.applicationConfig = new ApplicationConfig({
                    applicationID: req.application._id,
                    applicationToken: req.application.token,
                    domain: extension.cluster,
                    logLevel: configData.debug ===  true? "debug": null
                });
                req.applicationClient = new ApplicationClient(req.applicationConfig);
            }

            next();
        } catch (error) {
            next(error);
        }
    });

    apiRoutes.use(sessionMiddleware(true), async (req, res, next) => {
        try {
            const client = await extension.getPlatformClient(req.fdkSession.company_id, req.fdkSession);
            req.platformClient = client;
            req.extension = extension;
            next();
        } catch (error) {
            next(error);
        }
    });

    partnerApiRoutes.use(partnerSessionMiddleware(true), async (req, res, next) => {
        try {
            const client = await extension.getPartnerClient(req.fdkSession.organization_id, req.fdkSession);
            req.partnerClient = client;
            req.extension = extension;
            next();
        } catch (error) {
            next(error);
        }
    });

    return {
        partnerApiRoutes: partnerApiRoutes,
        platformApiRoutes: apiRoutes,
        apiRoutes: apiRoutes, // this is deprecated use platformApiRoutes
        applicationProxyRoutes: applicationProxyRoutes
    };
}

module.exports = {
    setupProxyRoutes: setupProxyRoutes
};