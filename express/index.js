'use strict';

const {Extension} = require('./extension');
const setupRoutes = require("./routes");
const { setupProxyRoutes } = require("./api_routes");
const Session = require("./session/session");
const { ApplicationConfig, ApplicationClient } = require("fdk-client-javascript");

function setupFdk(data) {
    var extension = new Extension();
    extension.initialize(data);
    let router = setupRoutes(extension);
    let { apiRoutes, applicationProxyRoutes } = setupProxyRoutes(extension);

    async function getPlatformClient(companyId) {
        let client = null;
        if(!extension.isOnlineAccessMode()) {
            let sid = Session.generateSessionId(false, {
                cluster: extension.cluster,
                companyId: companyId
            });
            let session = await extension.sessionStorage.getSession(sid);
            client = await extension.getPlatformClient(companyId, session);
        }
        return client;
    }

    async function getApplicationClient(applicationId, applicationToken) {
        let applicationConfig = new ApplicationConfig({
            applicationID: applicationId,
            applicationToken: applicationToken,
            domain: extension.cluster
        });
        let applicationClient = new ApplicationClient(applicationConfig);
        return applicationClient;
    }

    return {
        fdkHandler: router,
        extension: extension,
        apiRoutes: apiRoutes,
        webhookRegistry: extension.webhookRegistry,
        applicationProxyRoutes: applicationProxyRoutes,
        getPlatformClient: getPlatformClient,
        getApplicationClient: getApplicationClient
    };
}

module.exports = {
    setupFdk: setupFdk
};