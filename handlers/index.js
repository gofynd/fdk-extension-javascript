const Session = require("../session/session");
const SessionStorage = require("../session/session_storage");
const { v4: uuidv4 } = require("uuid");
const logger = require("../logger");
const {
    FdkSessionNotFoundError,
    FdkInvalidOAuthError,
} = require("../error_code");

const fpInstall = async function fpInstall(company_id, application_id, ext) {
    let companyId = parseInt(company_id);
    let platformConfig = ext.getPlatformConfig(companyId);
    let session;

    session = new Session(Session.generateSessionId(true));

    let sessionExpires = new Date(Date.now() + 900000); // 15 min

    if (session.isNew) {
        session.company_id = companyId;
        session.scope = ext.scopes;
        session.expires = sessionExpires;
        session.access_mode = "online"; // Always generate online mode token for extension launch
        session.extension_id = ext.api_key;
    } else {
        if (session.expires) {
            session.expires = new Date(session.expires);
        }
    }

    let redirectUrl;

    session.state = uuidv4();

    // pass application id if received
    let authCallback = ext.getAuthCallback();
    if (application_id) {
        authCallback += "?application_id=" + application_id;
    }

    // start authorization flow
    redirectUrl = platformConfig.oauthClient.startAuthorization({
        scope: session.scope,
        redirectUri: authCallback,
        state: session.state,
        access_mode: "online", // Always generate online mode token for extension launch
    });
    await SessionStorage.saveSession(session);
    logger.debug(`Redirecting after install callback to url: ${redirectUrl}`);
    return {
        redirectUrl: redirectUrl,
        fdkSession: session,
    };
};

const fpAuth = async function fpAuth (reqObj, state, code, ext, sessionId) {
    const fdkSession = await SessionStorage.getSession(sessionId);
    if (!fdkSession) { 
        throw new FdkSessionNotFoundError(
            "Can not complete oauth process as session not found"
        );
    }
    if (fdkSession.state !== state) {
        throw new FdkInvalidOAuthError("Invalid oauth call");
    }
    const companyId = fdkSession.company_id;

    const platformConfig = ext.getPlatformConfig(fdkSession.company_id);
    await platformConfig.oauthClient.verifyCallback({code});

    let token = platformConfig.oauthClient.raw_token;
    let sessionExpires = new Date(Date.now() + token.expires_in * 1000);

    fdkSession.expires = sessionExpires;
    token.access_token_validity = sessionExpires.getTime();
    fdkSession.updateToken(token);

    await SessionStorage.saveSession(fdkSession);

    // Generate separate access token for offline mode
    if (!ext.isOnlineAccessMode()) {
        let sid = Session.generateSessionId(false, {
            cluster: ext.cluster,
            companyId: companyId,
        });
        let session = await SessionStorage.getSession(sid);
        if (!session) {
            session = new Session(sid);
        } else if (session.extension_id !== ext.api_key) {
            session = new Session(sid);
        }

        let offlineTokenRes =
            await platformConfig.oauthClient.getOfflineAccessToken(
                ext.scopes,
                code
            );

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
    
    if (
        ext.webhookRegistry.isInitialized &&
        ext.webhookRegistry.isSubscribeOnInstall
    ) {
        const client = await ext.getPlatformClient(companyId, fdkSession);
        await ext.webhookRegistry.syncEvents(client, null, true).catch((err) => {
            logger.error(err);
        });
    }

    let redirectUrl = await ext.callbacks.auth(reqObj);
    logger.debug(`Redirecting after auth callback to url: ${redirectUrl}`);
    return {
        redirectUrl: redirectUrl,
        fdkSession: fdkSession,
    };
};

const fpAutoInstall = async function fpAutoInstall (reqObj, company_id, code, ext) {
    logger.debug(
        `Extension auto install started for company: ${company_id} on company creation.`
    );

    let platformConfig = ext.getPlatformConfig(company_id);
    let sid = Session.generateSessionId(false, {
        cluster: ext.cluster,
        companyId: company_id,
    });

    let session = await SessionStorage.getSession(sid);
    if (!session) {
        session = new Session(sid);
    } else if (session.extension_id !== ext.api_key) {
        session = new Session(sid);
    }

    let offlineTokenRes = await platformConfig.oauthClient.getOfflineAccessToken(
        ext.scopes,
        code
    );

    session.company_id = company_id;
    session.scope = ext.scopes;
    session.state = uuidv4();
    session.extension_id = ext.api_key;
    offlineTokenRes.access_token_validity =
        platformConfig.oauthClient.token_expires_at;
    offlineTokenRes.access_mode = "offline";
    session.updateToken(offlineTokenRes);

    if (!ext.isOnlineAccessMode()) {
        await SessionStorage.saveSession(session);
    }

    if (
        ext.webhookRegistry.isInitialized &&
        ext.webhookRegistry.isSubscribeOnInstall
    ) {
        const client = await ext.getPlatformClient(company_id, session);
        await ext.webhookRegistry.syncEvents(client, null, true).catch((err) => {
            logger.error(err);
        });
    }
    logger.debug(
        `Extension installed for company: ${company_id} on company creation.`
    );
    if (ext.callbacks.auto_install) {
        await ext.callbacks.auto_install(reqObj);
    }
    return;
};

const fpUninstall = async function fpUninstall (reqObj,company_id, ext) {
    let sid;
    if (!ext.isOnlineAccessMode()) {
        sid = Session.generateSessionId(false, {
            cluster: ext.cluster,
            companyId: company_id,
        });
        await SessionStorage.deleteSession(sid);
    }
    await ext.callbacks.uninstall(reqObj);
    return;
};
module.exports = {
    fpAuth: fpAuth,
    fpInstall: fpInstall,
    fpAutoInstall: fpAutoInstall,
    fpUninstall: fpUninstall,
};
