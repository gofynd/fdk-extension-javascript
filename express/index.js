const { ApplicationClient } = require('@gofynd/fdk-client-javascript');
const { extension } = require('./extension');
const setupRoutes = require('./routes');
const { setupProxyRoutes } = require('./api_routes');
const Session = require('./session/session');
const SessionStorage = require('./session/session_storage');
const logger = require('./logger');

function setupFdk(data, syncInitialization) {
  if (data.debug) {
    logger.transports[0].level = 'debug';
  }
  const promiseInit = extension.initialize(data)
    .catch((err) => {
      logger.error(err);
      throw err;
    });
  const router = setupRoutes(extension);
  const {
    apiRoutes, platformApiRoutes, applicationProxyRoutes, partnerApiRoutes,
  } = setupProxyRoutes(data);

  async function getPlatformClient(companyId) {
    let client = null;
    if (!extension.isOnlineAccessMode()) {
      const sid = Session.generateSessionId(false, {
        cluster: extension.cluster,
        id: companyId,
      });
      const session = await SessionStorage.getSession(sid);
      client = await extension.getPlatformClient(companyId, session);
    }
    return client;
  }

  async function getApplicationClient(applicationId, applicationToken) {
    return new ApplicationClient({
      applicationID: applicationId,
      applicationToken,
      domain: extension.cluster,
      logLevel: data.debug === true ? 'debug' : null,
    });
  }

  async function getPartnerClient(organizationId) {
    let client = null;
    if (!extension.isOnlineAccessMode()) {
      const sid = Session.generateSessionId(false, {
        cluster: extension.cluster,
        id: organizationId,
      });
      const session = await SessionStorage.getSession(sid);
      client = await extension.getPartnerClient(organizationId, session);
    }
    return client;
  }

  const configInstance = {
    fdkHandler: router,
    extension,
    apiRoutes,
    platformApiRoutes,
    partnerApiRoutes,
    webhookRegistry: extension.webhookRegistry,
    applicationProxyRoutes,
    getPlatformClient,
    getPartnerClient,
    getApplicationClient,
  };

  return syncInitialization ? promiseInit.then(() => configInstance).catch(() => configInstance) : configInstance;
}

module.exports = {
  setupFdk,
};
