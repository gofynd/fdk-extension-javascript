'use strict';

const hmacSHA256 = require("crypto-js/hmac-sha256");
const { TEST_WEBHOOK_EVENT_NAME } = require("./constants");
const { FdkWebhookHandleFailure, FdkWebhookHandlerNotFound, FdkWebhookRegistrationError, FdkInvalidHMacError } = require("./error_code");

class WebhookHandler {
    constructor() {
        this._handlerMap = null;
        this._config = null;
        this._fdkConfig = null;
    }

    initialize(config, fdkConfig) {
        this._handlerMap = {};
        this._config = config;
        this._fdkConfig = fdkConfig;
        for (let [eventName, handlerData] of Object.entries(this._config.event_map)) {
            this._handlerMap[eventName] = handlerData;
        }
    }

    isInitialized() {
        return !!this._handlerMap;
    }

    getEventIdMap(events) {
        return events.reduce((map, event) => {
            map[`${event.event_name}/${event.event_type}`] = event.id;
            return map;
        }, {});
    }

    async syncEvents(platformClient, config = null) {

        if (config) {
            this.initialize(config, this._fdkConfig);
        }

        let subscriberConfig = null;
        const promises = [];
        let eventsMap = null;
        promises.push(platformClient.webhook.fetchAllEventConfigurations());
        promises.push(platformClient.webhook.getSubscribersByExtensionId({ extensionId: this._fdkConfig.api_key }));

        [eventsMap, subscriberConfig] = await Promise.all(promises);

        eventsMap = this.getEventIdMap(eventsMap.event_configs);
        let registerNew = false;
        let existingEvents = [];
        subscriberConfig = subscriberConfig.items[0];
        if (!subscriberConfig) {
            subscriberConfig = {
                "name": this._fdkConfig.api_key,
                "webhook_url": `${this._fdkConfig.base_url}${this._config.api_path}`,
                "association": {
                    "company_id": platformClient.config.companyId
                },
                "status": "active",
                "auth_meta": {
                    "type": "hmac",
                    "secret": this._fdkConfig.api_secret
                },
                "event_id": [],
                "email_id": this._config.notification_email
            }
            registerNew = true;
        }
        else {
            const { id, name, webhook_url, association, status, auth_meta, event_configs } = subscriberConfig
            subscriberConfig = { id, name, webhook_url, association, status, auth_meta };
            subscriberConfig.event_id = [];
            existingEvents = event_configs.map(event=>event.id);
        }
        for (let eventName of Object.keys(this._handlerMap)) {
            if (eventsMap[eventName]) {
                subscriberConfig.event_id.push(eventsMap[eventName]);
            }
        }

        try {
            if (registerNew) {
                await platformClient.webhook.registerSubscriberToEvent({ body: subscriberConfig });
            }
            else {
                const eventDiff = existingEvents.filter(eventId => !subscriberConfig.event_id.includes(eventId))
                if (eventDiff.length) {
                    await platformClient.webhook.updateSubscriberConfig({ body: subscriberConfig });
                }
            }
        }
        catch(ex) {
            throw new FdkWebhookRegistrationError(`Failed to sync webhook events ${ex.message}`);
        }
    }

    verifySignature(req) {
        const reqSignature = req.headers['x-fp-signature'];
        const { body } = req;
        const calcSignature = hmacSHA256(JSON.stringify(body), this._fdkConfig.api_secret).toString();
        if (reqSignature !== calcSignature) {
            throw new FdkInvalidHMacError(`Signature passed does not match calculated body signature`);
        }
    }

    async processWebhook(req) {
        try {
            this.verifySignature(req);
            const { body } = req;
            const eventName = `${body.event.name}/${body.event.type}`;
            const extHandler = (this._handlerMap[eventName] || {}).handler;
            if (typeof extHandler === 'function') {
                await extHandler(eventName, req.body.company_id, req.body.payload);
            }
            else {
                if(body.event.name !== TEST_WEBHOOK_EVENT_NAME) {
                    throw new FdkWebhookHandlerNotFound(`Webhook handler not assigned ${eventName}`);
                }
            }
        }
        catch (err) {
            throw new FdkWebhookHandleFailure(err.message);
        }
    }

}

module.exports = {
    WebhookHandler
}