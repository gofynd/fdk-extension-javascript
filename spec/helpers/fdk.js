const { SQLiteStorage } = require("../../express/storage");
const { sqliteInstance } = require("../helpers/setup_db");
let sessionId;
const getSession = () => {
    return sessionId;
}
const fdkConfig = {
    api_key: "API_KEY",
    api_secret: "API_SECRET",
    base_url: "http://localdev.fyndx0.de",
    scopes: ["company/products"],
    callbacks: {
        auth: ({ fdkSession }) => {
            sessionId = fdkSession.id;
            return "test.com"
        },
        uninstall: () => { }
    },
    storage: new SQLiteStorage(sqliteInstance, "test_fdk"),
    access_mode: "online",
    cluster: "http://localdev.fyndx0.de",
    debug: true,
}

const initializeFDK = (settings) => {
    const { setupFdk } = require("../../express");
    return setupFdk({...fdkConfig, ...settings})
};

const initializeFastifyFDK = (settings) => {
    const { setupFdk } = require("../../fastify");
    return setupFdk({...fdkConfig, ...settings})
};

const initializNestFDK = (settings) => {
    const { setupFdk } = require("../../nest");
    return setupFdk({...fdkConfig, ...settings})
};

module.exports = {
    initializeFDK,
    initializeFastifyFDK,
    initializNestFDK,
    getSession
}