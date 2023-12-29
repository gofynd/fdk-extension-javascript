import { Injectable } from '@nestjs/common';
const { extension } = require('../extension');
const { getApplicationConfig } = require('../middleware/session_middleware');

@Injectable()
class ApplicationProxyRoutes {
  async use(req, res, next) {
    try {
      const { user, application, applicationConfig, applicationClient } = await getApplicationConfig(req.headers["x-user-data"], req.headers["x-application-data"], extension)
      req.user = user;
      req.application = application;
      req.applicationConfig = applicationConfig;
      req.applicationClient = applicationClient;
      next();
    } catch (error) {
      next(error)
    }
  }
}

module.exports = {
  applicationProxyRoutes: ApplicationProxyRoutes
}
