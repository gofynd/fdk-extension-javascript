const supertest = require('supertest')
const fastify = require("fastify");
const app = fastify();
app.register(require('@fastify/cookie'), {
    secret: ['ext.session']
});
request = supertest(app.server);
request.app = app;
module.exports = request;