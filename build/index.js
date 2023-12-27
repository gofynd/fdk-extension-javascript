'use strict';
const { extension } = require('./extension');
const setupRoutes = require("./express/routes");
const { setupProxyRoutes } = require("./express/api_routes");
const logger = require('./logger');
const { isAuthorized, getApplicationConfig } = require('./middleware/session_middleware');
const routerHandlers = require('./handlers');
const { getApplicationClient, getPlatformClient } = require('./utils');
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
    let { apiRoutes, applicationProxyRoutes } = setupProxyRoutes();
    const configInstance = {
        fdkHandler: router,
        extension: extension,
        apiRoutes: apiRoutes,
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