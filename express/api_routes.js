'use strict';
const { extension } = require('./extension');
const express = require('express');
const { sessionMiddleware, partnerSessionMiddleware, verifySignature } = require('./middleware/session_middleware');
const { ApplicationConfig, ApplicationClient } = require("@gofynd/fdk-client-javascript");
const logger = require('./logger');


function setupProxyRoutes(configData) {
    const apiRoutes = express.Router({ mergeParams: true });
    const applicationProxyRoutes = express.Router({ mergeParams: true });
    const partnerApiRoutes = express.Router({ mergeParams: true });

    applicationProxyRoutes.use(async (req, res, next) => {
        try {
            if (req.headers["x-fp-signature"]) {
                if(!verifySignature(req, configData.api_secret)) {
                    logger.error("Invalid signature: Signature generated not matching with the x-fp-signature requestheader");
                    return res.status(401).send({
                        message: "Invalid signature"
                    });
                } else{
                    const allowedTimeWindow = 1000; // 1 second
                    const currentTimestamp = Math.floor(Date.now() / 1000); // Current time in seconds
                    const requestTimestamp = req.headers.timestamp; // Ensure the timestamp is part of the request body
                    if (!requestTimestamp || Math.abs(currentTimestamp - requestTimestamp) > allowedTimeWindow) {
                        logger.error("Request expired: Request took more than 1 second to process");
                        return res.status(401).send({
                            message: "Request expired"
                        });
                    }
                }
            } else{
                logger.error("Signature not found: x-fp-signature not found in the request headers");
                return res.status(401).send({
                    message: "Signature not found"
                });
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