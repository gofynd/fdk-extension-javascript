const bodyParser = require('body-parser');
const express = require('express');
const cookieParser = require('cookie-parser');
const {
    setupFdk
} = require("../express");
const { RedisStorage } = require("./../express/storage");
const extensionHandler = require("./extension.handler");
const Redis = require("ioredis");

const fs = require('fs');
const path = require('path');

const app = express();
app.use(cookieParser("ext.session"));
app.use(bodyParser.json({
    limit: '2mb'
}));

let data = fs.readFileSync(path.join(__dirname + "/.ngrock"));
let baseUrl = data.toString() || "http://localhost:5070";
console.log(baseUrl);

// let baseUrl = 'https://fdk-extension-javascript-local.loca.lt'

function handleCouponEdit(eventName, payload, companyId, applicationId) {
    console.log(`Event received for ${companyId} and ${applicationId}`);
    console.log(payload);
}

function handleProductEvent(eventName, payload, companyId) {
    console.log(`Event received for ${companyId}`);
    console.log(payload);
}

function handleSalesChannelProductEvent(eventName, payload, companyId, applicationId) {
    console.log(`Event received for ${companyId} and ${applicationId} and event_category ${payload.event.category}`);
    console.log(payload);
}

function handleLocationEvent(eventName, payload, companyId) {
    console.log(`Event received for ${companyId} and event_category ${payload.event.category}`);
    console.log(payload);
}


const redis = new Redis();

let fdkExtension = setupFdk({
    api_key: "6220daa4a5414621b975a41f",
    api_secret: "EbeGBRC~Fthv5om",
    base_url: baseUrl, // this is optional 
    scopes: ["company/product"], // this is optional
    callbacks: extensionHandler,
    storage: new RedisStorage(redis),
    access_mode: "offline",
    cluster: "https://api.fyndx0.de", // this is optional by default it points to prod.
    webhook_config: {
        api_path: "/webhook",
        notification_email: "test2@abc.com", // required
        subscribed_saleschannel: 'specific', //optional
        event_map: { // required
            'application/coupon/update': {
                version: '1',
                handler: handleCouponEdit
            },
            'company/location/update': {
                version: '1',
                handler: handleLocationEvent
            },
            'company/product/create': {
                version: '1',
                handler: handleProductEvent
            },
            'application/product/create': {
                version: '1',
                handler: handleSalesChannelProductEvent
            }
        }
    }
});

app.use(fdkExtension.fdkHandler);
app.use('/_healthz', (req, res, next) => {
    res.json({
        "ok": "ok"
    });
});

fdkExtension.apiRoutes.get("/test/routes", async (req, res, next) => {
    try {
        let data = await req.platformClient.lead.getTickets();
        res.json(data);
    } catch (error) {
        console.error(error);
        next(error);
    }

});

fdkExtension.applicationProxyRoutes.get("/1234", async (req, res, next) => {
    try {
        let data = await req.platformClient.lead.getTickets();
        res.json(data);
    } catch (error) {
        console.error(error);
        next(error);
    }

});

// sample webhook endpoint
const webhookRouter = express.Router({ mergeParams: true });
webhookRouter.post("/webhook", async (req, res, next) => {
    try {
        await fdkExtension.webhookRegistry.processWebhook(req);
        res.json({ "success": true });
    } catch (err) {
        console.error(err);
        res.status(404).json({ "success": false });
    }
});

fdkExtension.apiRoutes.post("/webhook/application/:application_id/subscribe", async (req, res, next) => {
    try {
        await fdkExtension.webhookRegistry.enableSalesChannelWebhook(req.platformClient, req.params.application_id);
        res.json({ "success": true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "success": false });
    }
});

fdkExtension.apiRoutes.post("/webhook/application/:application_id/unsubscribe", async (req, res, next) => {
    try {
        await fdkExtension.webhookRegistry.disableSalesChannelWebhook(req.platformClient, req.params.application_id);
        res.json({ "success": true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ "success": false });
    }
});

app.use(webhookRouter);
app.use(fdkExtension.applicationProxyRoutes);
app.use(fdkExtension.apiRoutes);

app.use("*", async (req, res, next) => {
    res.json({ "success": true });
});

app.use(function onError(err, req, res, next) {
    err = err || {};

    let statusCode = 500;
    if (err.name === 'ValidationError') {
        statusCode = 400;
    }
    if (err.name === 'CastError') {
        statusCode = 400;
    }
    if (err.statusCode) {
        statusCode = err.statusCode;
    }

    let resData = {
        message: err.errors || err.message || err,
        code: err.code,
        sentry: res.sentry
    };

    resData.stack = err.stack;
    console.log(resData);
    res.status(statusCode).json(resData);
});

app.listen(5070);