'use strict';
const express = require('express');
const { v4: uuidv4 } = require("uuid");
const Session = require("./session/session");
const { FdkSessionNotFoundError, FdkInvalidOAuthError } = require("./error_code");
const { SESSION_COOKIE_NAME } = require('./constants');
const { sessionMiddleware } = require('./middleware/session_middleware');
const { ExtensionFactory } = require('./extension_factory');
const logger = require('./logger');
const FdkRoutes = express.Router();


function setupRoutes(ext) {

    FdkRoutes.get("/fp/install", async (req, res, next) => {
        // ?company_id=1&client_id=123313112122
        try {
            const cluster_id = req.query.cluster_origin;
            if (cluster_id) {
                ext = ExtensionFactory.getExtension(cluster_id)
            }
            let companyId = parseInt(req.query.company_id);
            let platformConfig = await ext.getPlatformConfig(companyId);
            let session;
            if (ext.isOnlineAccessMode()) {
                session = new Session(Session.generateSessionId(true));
            } else {
                let sid = Session.generateSessionId(false, {
                    cluster: ext.cluster,
                    companyId: companyId
                });
                session = await ext.sessionStorage.getSession(sid);
                if (!session) {
                    session = new Session(sid);
                } else if (session.extension_id !== ext.api_key) {
                    session = new Session(sid);
                }
            }

            session = new Session(Session.generateSessionId(true));

            let sessionExpires = new Date(Date.now() + 900000); // 15 min

            if (session.isNew) {
                session.company_id = companyId;
                session.scope = ext.scopes;
                session.expires = sessionExpires;
                session.access_mode = 'online'; // Always generate online mode token for extension launch
                session.extension_id = ext.api_key;
            } else {
                if (session.expires) {
                    session.expires = new Date(session.expires);
                }
            }

            req.fdkSession = session;
            req.extension = ext;

            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            res.header['x-company-id'] = companyId;
            res.cookie(compCookieName, session.id, {
                secure: true,
                httpOnly: true,
                expires: session.expires,
                signed: true,
                sameSite: "None"
            });

            let redirectUrl;

            session.state = uuidv4();

            // pass application id if received
            let authCallback = ext.getAuthCallback();
            if (req.query.application_id) {
                authCallback += "?application_id=" + req.query.application_id;
            }

            // start authorization flow 
            redirectUrl = platformConfig.oauthClient.startAuthorization({
                scope: session.scope,
                redirectUri: authCallback,
                state: session.state,
                access_mode: 'online' // Always generate online mode token for extension launch
            });
            await ext.sessionStorage.saveSession(session);
            logger.debug(`Redirecting after install callback to url: ${redirectUrl}`);
            res.redirect(redirectUrl);
        } catch (error) {
            next(error);
        }
    });

    FdkRoutes.get("/fp/auth", sessionMiddleware(ext, false), async (req, res, next) => {
        // ?code=ddjfhdsjfsfh&client_id=jsfnsajfhkasf&company_id=1&state=jashoh
        try {
            const cluster_id = req.query.cluster_origin;
            if (cluster_id) {
                ext = ExtensionFactory.getExtension(cluster_id)
            }
            if (!req.fdkSession) {
                throw new FdkSessionNotFoundError("Can not complete oauth process as session not found");
            }

            if (req.fdkSession.state !== req.query.state) {
                throw new FdkInvalidOAuthError("Invalid oauth call");
            }
            const companyId = req.fdkSession.company_id

            const platformConfig = await ext.getPlatformConfig(req.fdkSession.company_id);
            await platformConfig.oauthClient.verifyCallback(req.query);

            let token = platformConfig.oauthClient.raw_token;
            let sessionExpires = new Date(Date.now() + token.expires_in * 1000);

            req.fdkSession.expires = sessionExpires;
            token.access_token_validity = sessionExpires.getTime();
            req.fdkSession.updateToken(token);

            await ext.sessionStorage.saveSession(req.fdkSession);

            // Generate separate access token for offline mode
            if (!ext.isOnlineAccessMode()) {

                let sid = Session.generateSessionId(false, {
                    cluster: ext.cluster,
                    companyId: companyId
                });
                let session = await ext.sessionStorage.getSession(sid);
                if (!session) {
                    session = new Session(sid);
                } else if (session.extension_id !== ext.api_key) {
                    session = new Session(sid);
                }

                let offlineTokenRes = await platformConfig.oauthClient.getOfflineAccessToken(ext.scopes, req.query.code);

                session.company_id = companyId;
                session.scope = ext.scopes;
                session.state = req.fdkSession.state;
                session.extension_id = ext.api_key;
                offlineTokenRes.access_token_validity = platformConfig.oauthClient.token_expires_at;
                offlineTokenRes.access_mode = 'offline';
                session.updateToken(offlineTokenRes);

                await ext.sessionStorage.saveSession(session);

            }

            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            res.cookie(compCookieName, req.fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: sessionExpires,
                signed: true,
                sameSite: "None"
            });
            res.header['x-company-id'] = companyId;
            req.extension = ext;
            if (ext.webhookRegistry.isInitialized && ext.webhookRegistry.isSubscribeOnInstall) {
                const client = await ext.getPlatformClient(companyId, req.fdkSession);
                await ext.webhookRegistry.syncEvents(client, null, true).catch((err) => {
                    logger.error(err);
                });
            }
            let redirectUrl = await ext.callbacks.auth(req);
            logger.debug(`Redirecting after auth callback to url: ${redirectUrl}`);
            res.redirect(redirectUrl);
        } catch (error) {
            logger.error(error);
            next(error);
        }
    });


    FdkRoutes.post("/fp/auto_install", sessionMiddleware(ext, false), async (req, res, next) => {
        try {

            let { company_id, code } = req.body;
            const cluster_id = req.query.cluster_origin;
            if (cluster_id) {
                ext = ExtensionFactory.getExtension(cluster_id)
            }
            logger.debug(`Extension auto install started for company: ${company_id} on company creation.`);

            let platformConfig = await ext.getPlatformConfig(company_id);
            let sid = Session.generateSessionId(false, {
                cluster: ext.cluster,
                companyId: company_id
            });

            let session = await ext.sessionStorage.getSession(sid);
            if (!session) {
                session = new Session(sid);
            } else if (session.extension_id !== ext.api_key) {
                session = new Session(sid);
            }

            let offlineTokenRes = await platformConfig.oauthClient.getOfflineAccessToken(ext.scopes, code);

            session.company_id = company_id;
            session.scope = ext.scopes;
            session.state = uuidv4();
            session.extension_id = ext.api_key;
            offlineTokenRes.access_token_validity = platformConfig.oauthClient.token_expires_at;
            offlineTokenRes.access_mode = 'offline';
            session.updateToken(offlineTokenRes);

            if (!ext.isOnlineAccessMode()) {
                await ext.sessionStorage.saveSession(session);
            }

            if (ext.webhookRegistry.isInitialized && ext.webhookRegistry.isSubscribeOnInstall) {
                const client = await ext.getPlatformClient(company_id, session);
                await ext.webhookRegistry.syncEvents(client, null, true).catch((err) => {
                    logger.error(err);
                });
            }
            logger.debug(`Extension installed for company: ${company_id} on company creation.`);
            if (ext.callbacks.auto_install) {
                await ext.callbacks.auto_install(req);
            }
            res.json({ message: "success" });
        } catch (error) {
            logger.error(error);
            next(error);
        }
    });

    FdkRoutes.post("/fp/uninstall", async (req, res, next) => {
        try {
            let { company_id } = req.body;
            const cluster_id = req.query.cluster_origin;
            if (cluster_id) {
                ext = ExtensionFactory.getExtension(cluster_id)
            }
            let sid;
            if (!ext.isOnlineAccessMode()) {
                sid = Session.generateSessionId(false, {
                    cluster: ext.cluster,
                    companyId: company_id
                });
                let session = await ext.sessionStorage.getSession(sid);
                const client = await ext.getPlatformClient(company_id, session);
                req.platformClient = client;
                await ext.sessionStorage.deleteSession(sid);
            }
            req.extension = ext;
            await ext.callbacks.uninstall(req);
            res.json({ success: true });
        } catch (error) {
            logger.error(error);
            next(error);
        }
    });

    return FdkRoutes;
}


module.exports = setupRoutes;