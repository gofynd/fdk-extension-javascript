'use strict';
const { extension } = require('./lib/extension');
const setupRoutes = require("./express/routes");
const { setupProxyRoutes } = require("./express/api_routes");
const logger = require('./lib/logger');
const { getSessionData, getApplicationConfig, getUserData } = require('./lib/utils');
const routerHandlers = require('./lib/handlers');
const { getApplicationClient, getPlatformClient, getPartnerClient } = require('./lib/utils');
function setupFdk(data, syncInitialization) {
    if (data.debug) {
        logger.transports[0].level = 'debug';
    }
    const promiseInit = extension.initialize(data)
        .catch(err => {
        logger.error(err);
        throw err;
    });
    let router = setupRoutes(extension);
    let { apiRoutes, applicationProxyRoutes, partnerApiRoutes, platformApiRoutes } = setupProxyRoutes();
    const configInstance = {
        fdkHandler: router,
        extension: extension,
        apiRoutes: apiRoutes,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        partnerApiRoutes: partnerApiRoutes,
        platformApiRoutes: platformApiRoutes,
        getPlatformClient: getPlatformClient,
        getPartnerClient: getPartnerClient,
        getApplicationClient: getApplicationClient,
        getSessionData,
        getApplicationConfig,
        getUserData,
        routerHandlers: routerHandlers
    };
    return syncInitialization ? promiseInit.then(() => configInstance).catch(() => configInstance) : configInstance;
}
module.exports = {
    setupFdk: setupFdk
};
