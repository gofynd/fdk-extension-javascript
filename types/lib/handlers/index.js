const Session = require("../session/session");
const SessionStorage = require("../session/session_storage");
const { v4: uuidv4 } = require("uuid");
const logger = require("../../lib/logger");
const urljoin = require('url-join');
const { FdkSessionNotFoundError, FdkInvalidOAuthError, } = require("../../lib/error_code");
const extInstall = async function extInstall(company_id, application_id, redirect_path, ext) {
    let companyId = parseInt(company_id);
    let platformConfig = await ext.getPlatformConfig(companyId);
    let session;
    session = new Session(Session.generateSessionId(true));
    let sessionExpires = new Date(Date.now() + 900000);
    if (session.isNew) {
        session.company_id = companyId;
        session.scope = ext.scopes;
        session.expires = sessionExpires;
        session.access_mode = "online";
        session.extension_id = ext.api_key;
        session.redirect_path = redirect_path;
    }
    else {
        if (session.expires) {
            session.expires = new Date(session.expires);
        }
    }
    let redirectUrl;
    session.state = uuidv4();
    let authCallback = ext.getAuthCallback();
    if (application_id) {
        authCallback += "?application_id=" + application_id;
    }
    redirectUrl = platformConfig.oauthClient.startAuthorization({
        scope: session.scope,
        redirectUri: authCallback,
        state: session.state,
        access_mode: "online",
    });
    await SessionStorage.saveSession(session);
    logger.debug(`Redirecting after install callback to url: ${redirectUrl}`);
    return {
        redirectUrl: redirectUrl,
        fdkSession: session,
    };
};
const extAuth = async function extAuth(reqObj, state, code, ext, sessionId) {
    const fdkSession = await SessionStorage.getSession(sessionId);
    if (!fdkSession) {
        throw new FdkSessionNotFoundError("Can not complete oauth process as session not found");
    }
    if (fdkSession.state !== state) {
        throw new FdkInvalidOAuthError("Invalid oauth call");
    }
    const companyId = fdkSession.company_id;
    const platformConfig = await ext.getPlatformConfig(fdkSession.company_id);
    await platformConfig.oauthClient.verifyCallback({ code });
    let token = platformConfig.oauthClient.raw_token;
    let sessionExpires = new Date(Date.now() + token.expires_in * 1000);
    fdkSession.expires = sessionExpires;
    token.access_token_validity = sessionExpires.getTime();
    fdkSession.updateToken(token);
    await SessionStorage.saveSession(fdkSession);
    if (!ext.isOnlineAccessMode()) {
        let sid = Session.generateSessionId(false, {
            cluster: ext.cluster,
            id: companyId,
        });
        let session = await SessionStorage.getSession(sid);
        if (!session) {
            session = new Session(sid);
        }
        else if (session.extension_id !== ext.api_key) {
            session = new Session(sid);
        }
        let offlineTokenRes = await platformConfig.oauthClient.getOfflineAccessToken(ext.scopes, code);
        session.company_id = companyId;
        session.scope = ext.scopes;
        session.state = fdkSession.state;
        session.extension_id = ext.api_key;
        offlineTokenRes.access_token_validity =
            platformConfig.oauthClient.token_expires_at;
        offlineTokenRes.access_mode = "offline";
        session.updateToken(offlineTokenRes);
        await SessionStorage.saveSession(session);
    }
    if (ext.webhookRegistry.isInitialized &&
        ext.webhookRegistry.isSubscribeOnInstall) {
        const client = await ext.getPlatformClient(companyId, fdkSession);
        await ext.webhookRegistry.syncEvents(client, null, true).catch((err) => {
            logger.error(err);
        });
    }
    let redirectUrl = await ext.callbacks.auth(reqObj);
    if (fdkSession.redirect_path) {
        redirectUrl = fdkSession.redirect_path;
    }
    logger.debug(`Redirecting after auth callback to url: ${redirectUrl}`);
    return {
        redirectUrl: redirectUrl,
        fdkSession: fdkSession,
    };
};
const extUninstall = async function extUninstall(reqObj, company_id, ext) {
    let sid;
    if (!ext.isOnlineAccessMode()) {
        sid = Session.generateSessionId(false, {
            cluster: ext.cluster,
            id: company_id,
        });
        await SessionStorage.deleteSession(sid);
    }
    await ext.callbacks.uninstall(reqObj);
    return;
};
const admInstall = async function admInstall(organization_id, ext) {
    let partnerConfig = ext.getPartnerConfig(organization_id);
    let session;
    session = new Session(Session.generateSessionId(true));
    let sessionExpires = new Date(Date.now() + 900000);
    if (session.isNew) {
        session.organization_id = organization_id;
        session.scope = ext.scopes;
        session.expires = sessionExpires;
        session.access_mode = 'online';
        session.extension_id = ext.api_key;
    }
    else {
        if (session.expires) {
            session.expires = new Date(session.expires);
        }
    }
    session.state = uuidv4();
    let authCallback = urljoin(ext.base_url, "/adm/auth");
    let redirectUrl = partnerConfig.oauthClient.startAuthorization({
        scope: session.scope,
        redirectUri: authCallback,
        state: session.state,
        access_mode: 'online'
    });
    await SessionStorage.saveSession(session);
    logger.debug(`Redirect after partner install callback to url: ${redirectUrl}`);
    return {
        redirectUrl: redirectUrl,
        fdkSession: session,
    };
};
const admAuth = async function admAuth(state, code, ext, sessionId) {
    const fdkSession = await SessionStorage.getSession(sessionId);
    if (!fdkSession) {
        throw new FdkSessionNotFoundError("Can not complete oauth process as session not found");
    }
    if (fdkSession.state !== state) {
        throw new FdkInvalidOAuthError("Invalid oauth call");
    }
    const organizationId = fdkSession.organization_id;
    const partnerConfig = ext.getPartnerConfig(fdkSession.organization_id);
    await partnerConfig.oauthClient.verifyCallback({ code });
    let token = partnerConfig.oauthClient.raw_token;
    let sessionExpires = new Date(Date.now() + token.expires_in * 1000);
    fdkSession.expires = sessionExpires;
    token.access_token_validity = sessionExpires.getTime();
    fdkSession.updateToken(token);
    await SessionStorage.saveSession(fdkSession);
    if (!ext.isOnlineAccessMode()) {
        let sid = Session.generateSessionId(false, {
            cluster: ext.cluster,
            id: organizationId
        });
        let session = await SessionStorage.getSession(sid);
        if (!session) {
            session = new Session(sid);
        }
        else if (session.extension_id !== ext.api_key) {
            session = new Session(sid);
        }
        let offlineTokenRes = await partnerConfig.oauthClient.getOfflineAccessToken(ext.scopes, code);
        session.organization_id = organizationId;
        session.scope = ext.scopes;
        session.state = fdkSession.state;
        session.extension_id = ext.api_key;
        offlineTokenRes.access_token_validity = partnerConfig.oauthClient.token_expires_at;
        offlineTokenRes.access_mode = 'offline';
        session.updateToken(offlineTokenRes);
        await SessionStorage.saveSession(session);
    }
    let redirectUrl = urljoin(ext.base_url, '/admin');
    logger.debug(`Redirecting after auth callback to url: ${redirectUrl}`);
    return {
        redirectUrl: redirectUrl,
        fdkSession: fdkSession,
    };
};
module.exports = {
    extAuth: extAuth,
    extInstall: extInstall,
    extUninstall: extUninstall,
    admInstall: admInstall,
    admAuth: admAuth
};
