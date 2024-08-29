'use strict';
const { extension } = require('../lib/extension');
const { getApplicationConfig, getUserData } = require('../lib/utils');
const fp = require('fastify-plugin');
const applicationProxyRoutes = fp(function (fastify, options, done) {
    fastify.addHook('preHandler', async (req, res) => {
        try {
            const user = await getUserData(req.headers["x-user-data"]);
            const { application, applicationConfig, applicationClient } = await getApplicationConfig(req.headers["x-application-data"], extension);
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
