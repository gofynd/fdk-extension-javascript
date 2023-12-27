'use strict';
const { extension } = require('../extension');
const { getApplicationConfig } = require('../middleware/session_middleware');
const fp = require('fastify-plugin');
const applicationProxyRoutes = fp(function (fastify, options, done) {
    fastify.addHook('preHandler', async (req, res) => {
        try {
            const { user, application, applicationConfig, applicationClient } = await getApplicationConfig(req.headers["x-user-data"], req.headers["x-application-data"], extension);
            req.user = user;
            req.application = application;
            req.applicationConfig = applicationConfig;
            req.applicationClient = applicationClient;
        }
        catch (error) {
            throw error;
        }
    });
    done();
});
module.exports = {
    applicationProxyRoutes: applicationProxyRoutes
};
//# sourceMappingURL=api_routes.js.map