import { Injectable } from '@nestjs/common';
const { extension } = require('../extension');
const { getApplicationConfig, getUserData } = require('../utils');

@Injectable()
class ApplicationProxyRoutes {
  async use(req, res, next) {
    try {
      const user = await getUserData(req.headers["x-user-data"]);
      const { application, applicationConfig, applicationClient } = await getApplicationConfig(req.headers["x-application-data"], extension)
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
