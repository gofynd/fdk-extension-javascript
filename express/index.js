'use strict';

const { extension } = require('./extension');
const setupRoutes = require("./routes");
const { setupProxyRoutes } = require("./api_routes");
const Session = require("./session/session");
const SessionStorage = require("./session/session_storage");
const { ApplicationClient } = require("@gofynd/fdk-client-javascript");
const logger = require('./logger');

function setupFdk(data, syncInitialization) {
    if (data.debug) {
        logger.transports[0].level = 'debug';
    }
    const promiseInit = extension.initialize(data)
        .catch(err=>{
            logger.error(err);
            throw err;
        });
    let router = setupRoutes(extension);
    let { apiRoutes, platformApiRoutes, applicationProxyRoutes, partnerApiRoutes } = setupProxyRoutes(data);

    async function getPlatformClient(companyId) {
        let client = null;
        if (!extension.isOnlineAccessMode()) {
            let sid = Session.generateSessionId(false, {
                cluster: extension.cluster,
                id: companyId
            });
            let session = await SessionStorage.getSession(sid);
            client = await extension.getPlatformClient(companyId, session);
        }
        return client;
    }

    async function getApplicationClient(applicationId, applicationToken) {
        return new ApplicationClient({
            applicationID: applicationId,
            applicationToken: applicationToken,
            domain: extension.cluster,
            logLevel: data.debug === true ? "debug" : null
        });
    }

    async function getPartnerClient(organizationId) {
        let client = null;
        if (!extension.isOnlineAccessMode()) {
            let sid = Session.generateSessionId(false, {
                cluster: extension.cluster,
                id: organizationId
            });
            let session = await SessionStorage.getSession(sid);
            client = await extension.getPartnerClient(organizationId, session);
        }
        return client;
    }

    const configInstance =  {
        fdkHandler: router,
        extension: extension,
        apiRoutes: apiRoutes,
        platformApiRoutes: platformApiRoutes,
        partnerApiRoutes: partnerApiRoutes,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        getPlatformClient: getPlatformClient,
        getPartnerClient: getPartnerClient,
        getApplicationClient: getApplicationClient
    };

    return syncInitialization? promiseInit.then(()=>configInstance).catch(()=>configInstance): configInstance;
}

module.exports = {
    setupFdk: setupFdk
};