const { setupFdk } = require("../../express");
const { MemoryStorage } = require("../../express/storage");

module.exports = (settings) => {
    return setupFdk({
        api_key: "API_KEY",
        api_secret: "API_SECRET",
        base_url: "http://localdev.fyndx0.de",
        callbacks: {
            auth: ()=>{},
            uninstall: ()=>{}
        },
        storage: new MemoryStorage("test_fdk"),
        access_mode: "online",
        cluster: "http://localdev.fyndx0.de",
        ...settings
    })
};