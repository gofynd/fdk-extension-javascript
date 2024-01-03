'use strict';
const { extension } = require('../extension');
const logger = require('../logger');
const { applicationProxyRoutes } = require("./api_routes");
const { getSessionData, getApplicationConfig, getUserData } = require('../utils');
const routerHandlers = require('../handlers');
const { getApplicationClient, getPlatformClient } = require('../utils');
function setupFdk(data, syncInitialization) {
    if (data.debug) {
        logger.transports[0].level = 'debug';
    }
    const promiseInit = extension.initialize(data)
        .catch(err => {
        logger.error(err);
        throw err;
    });
    const configInstance = {
        extension: extension,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        getPlatformClient: getPlatformClient,
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
//# sourceMappingURL=index.js.map