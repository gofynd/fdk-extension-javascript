'use strict';

const {ExtensionFactory} = require('./extension_factory');
const setupRoutes = require("./routes");
const { setupProxyRoutes } = require("./api_routes");
const Session = require("./session/session");
const { ApplicationConfig, ApplicationClient } = require("@gofynd/fdk-client-javascript");
const logger = require('./logger');

function setupFdk(data, syncInitialization) {
    const multiClusterMode = data.cluster_config !== undefined;
    const clusterId = data.cluster?.replace("https://", "").replace("http://", "");
    if (data.debug) {
        logger.transports[0].level = 'debug';
    }

    const promiseInit = ExtensionFactory.initializeExtension(multiClusterMode? data.cluster_config: [data]).catch(err=>{
        logger.error(err);
        throw err;
    });

    const extension = !multiClusterMode? ExtensionFactory.defaultExtInstance(): ExtensionFactory.getExtension(clusterId);
    
    let router = setupRoutes(extension);
    let { apiRoutes, applicationProxyRoutes } = setupProxyRoutes(extension);

    async function getPlatformClient(companyId, clusterId = null) {
        let clusterExt = extension; 
        if (clusterId) {
            clusterExt = ExtensionFactory.getExtension(clusterId)
        }
        let client = null;
        if (!clusterExt.isOnlineAccessMode()) {
            let sid = Session.generateSessionId(false, {
                cluster: clusterExt.cluster,
                companyId: companyId
            });
            let session = await clusterExt.sessionStorage.getSession(sid);
            client = await clusterExt.getPlatformClient(companyId, session);
        }
        return client;
    }

    async function getApplicationClient(applicationId, applicationToken, clusterId = null) {
        let clusterExt = extension; 
        if (clusterId) {
            clusterExt = ExtensionFactory.getExtension(clusterId)
        }
        let applicationConfig = new ApplicationConfig({
            applicationID: applicationId,
            applicationToken: applicationToken,
            domain: clusterExt.cluster
        });
        let applicationClient = new ApplicationClient(applicationConfig);
        return applicationClient;
    }

    function getWebhookRegistry(clusterId) {
        let clusterExt = extension; 
        if (clusterId) {
            clusterExt = ExtensionFactory.getExtension(clusterId)
        }
        return clusterExt.webhookRegistry;
    }

    const configInstance =  {
        fdkHandler: router,
        extension: extension,
        apiRoutes: apiRoutes,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        getPlatformClient: getPlatformClient,
        getApplicationClient: getApplicationClient,
        getWebhookRegistry: getWebhookRegistry
    };

    return syncInitialization? promiseInit.then(()=>configInstance).catch(()=>configInstance): configInstance;
}

module.exports = {
    setupFdk: setupFdk
};