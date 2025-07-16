'use strict';
let supertest = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('../utils/logger');
const bodyParser = require('body-parser');
// const PORT = 5070;

module.exports = function listen(port = 5070){
    const app = express();
    app.use(cookieParser("ext.session"));
    app.use(bodyParser.json({ limit: '2mb' }));

    const server = app.listen(port , async () => {
        logger.info("Server started at http://localhost:" + port);
    });
    server.restApp = app;
    server.shutdown = function(cb) {
        if(server.close) { server.close(cb); }
    }
    let request = supertest(server);
    request.app = server;

    return request;
}