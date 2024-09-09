'use strict';

const { extension } = require('../lib/extension');
const setupRoutes = require("./routes");
const { applicationProxyRoutes } = require("./api_routes");
const logger = require('../lib/logger');
const { getSessionData, getApplicationConfig, getUserData } = require('../lib/utils');
const routerHandlers = require('../lib/handlers');
const { getApplicationClient, getPlatformClient, getPartnerClient } = require('../lib/utils');

function setupFdk(data, syncInitialization) {
    if (data.debug) {
        logger.transports[0].level = 'debug';
    }
    const promiseInit = extension.initialize(data)
        .catch(err=>{
            logger.error(err);
            throw err;
        });

    const configInstance =  {
        fdkHandler: setupRoutes,
        extension: extension,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        getPlatformClient: getPlatformClient,
        getPartnerClient: getPartnerClient,
        getApplicationClient: getApplicationClient,
        getSessionData,
        getApplicationConfig,
        getUserData,
        routerHandlers: routerHandlers
    };

    return syncInitialization? promiseInit.then(()=>configInstance).catch(()=>configInstance): configInstance;
}

module.exports = {
    setupFdk: setupFdk
};