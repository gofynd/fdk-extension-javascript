'use strict';
const { extension } = require('./extension');
const express = require('express');
const { sessionMiddleware, partnerSessionMiddleware, verifySignature } = require('./middleware/session_middleware');
const { ApplicationClient } = require("@gofynd/fdk-client-javascript");
const logger = require('./logger');


function setupProxyRoutes(configData) {
    const apiRoutes = express.Router({ mergeParams: true });
    const applicationProxyRoutes = express.Router({ mergeParams: true });
    const partnerApiRoutes = express.Router({ mergeParams: true });

    applicationProxyRoutes.use(async (req, res, next) => {
        try {
            if (req.headers["x-fp-signature"]) {
                const verificationResult = verifySignature(req, configData.api_secret);
                if(!verificationResult.isValid) {
                    logger.error(`Signature verification failed: ${verificationResult.error}`);
                    if(verificationResult.isSignError) {
                        return res.status(403).send({
                            message: verificationResult.error
                        });
                    }
                    return res.status(400).send({
                        message: verificationResult.error
                    });
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
                req.applicationClient = new ApplicationClient({
                    applicationID: req.application._id,
                    applicationToken: req.application.token,
                    domain: extension.cluster,
                    logLevel: configData.debug === true ? "debug" : null
                });
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