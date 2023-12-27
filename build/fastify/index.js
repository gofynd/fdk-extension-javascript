'use strict';
const { extension } = require('../extension');
const setupRoutes = require("./routes");
const { applicationProxyRoutes } = require("./api_routes");
const logger = require('../logger');
const { isAuthorized, getApplicationConfig } = require('../middleware/session_middleware');
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
        fdkHandler: setupRoutes,
        extension: extension,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        getPlatformClient: getPlatformClient,
        getApplicationClient: getApplicationClient,
        middlewares: { isAuthorized, getApplicationConfig },
        routerHandlers: routerHandlers
    };
    return syncInitialization ? promiseInit.then(() => configInstance).catch(() => configInstance) : configInstance;
}
module.exports = {
    setupFdk: setupFdk
};
//# sourceMappingURL=index.js.map