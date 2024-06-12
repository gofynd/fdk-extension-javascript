const { setupFdk } = require("../../express");
const { RedisStorage } = require("../../express/storage");
const { redisConnection } = require("../helpers/setup_db");

const fdkConfig = {
    api_key: "API_KEY",
    api_secret: "API_SECRET",
    base_url: "http://localdev.fyndx0.de",
    scopes: ["company/products"],
    callbacks: {
        auth: ()=>{},
        uninstall: ()=>{}
    },
    storage: new RedisStorage(redisConnection, "test_fdk"),
    access_mode: "online",
    cluster: "http://localdev.fyndx0.de",
};

const initializeFDK = (settings) => {
    const { setupFdk } = require("../../express");
    return setupFdk({...fdkConfig, ...settings})
};

module.exports = {
    initializeFDK,
}