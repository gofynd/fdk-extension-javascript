'use strict';

const hmacSHA256 = require("crypto-js/hmac-sha256");
const { fdkAxios } = require("@gofynd/fdk-client-javascript/sdk/common/AxiosHelper");
const { version } = require('./../package.json');
const { TEST_WEBHOOK_EVENT_NAME, ASSOCIATION_CRITERIA } = require("./constants");
const { FdkWebhookProcessError, FdkWebhookHandlerNotFound, FdkWebhookRegistrationError, FdkInvalidHMacError, FdkInvalidWebhookConfig } = require("./error_code");
const logger = require("./logger");
const { RetryManger } = require("./retry_manager");

let eventConfig = {}
class WebhookRegistry {
    constructor(retryManager) {
        this._eventMap = null;
        this._config = null;
        this._fdkConfig = null;
        this._retryManager = retryManager;
    }

    async initialize(config, fdkConfig) {
      
        const emailRegex = new RegExp(/^\S+@\S+\.\S+$/, 'gi');
        if (!config.notification_email || !emailRegex.test(config.notification_email)) {
            throw new FdkInvalidWebhookConfig(`Invalid or missing "notification_email"`);
        }
        if (!config.api_path || config.api_path[0] !== '/') {
            throw new FdkInvalidWebhookConfig(`Invalid or missing "api_path"`);
        }
        if(config.marketplace == true && config.subscribed_saleschannel != "specific"){
            throw new FdkInvalidWebhookConfig(`marketplace is only allowed when subscribed_saleschannel is specific"`);
        }
        if (config.subscribed_saleschannel === 'specific' && 'subscribed_saleschannel_ids' in config && !Array.isArray(config.subscribed_saleschannel_ids)) {
            throw new FdkInvalidWebhookConfig(`subscribed_saleschannel_ids must be an array when subscribed_saleschannel is specific`);
        }
        if (!config.event_map || !Object.keys(config.event_map).length) {
            throw new FdkInvalidWebhookConfig(`Invalid or missing "event_map"`);
        }
        config.subscribe_on_install = config.subscribe_on_install === undefined ? true : config.subscribe_on_install;
        this._eventMap = {
            rest: {},
            kafka: {},
            pub_sub: {},
            sqs: {},
            event_bridge: {},
            temporal: {}
        };
        this._config = config;
        this._fdkConfig = fdkConfig;
 
        for (let [eventName, eventData] of Object.entries(this._config.event_map)) {
            // Validate Webhook Event Map
            if (eventName.split('/').length !== 3) {
                throw new FdkInvalidWebhookConfig(`Invalid webhook event map key. Invalid key: ${eventName}`)
            }
            // TODO: Earlier this is not mandatory
            if(!eventData.hasOwnProperty('version')){
                throw new FdkInvalidWebhookConfig(`Missing version in webhook event ${eventName}`);
            }
            if(!eventData.hasOwnProperty("provider")){
                eventData.provider = 'rest';
            }
            const allowedProviders = ['kafka', 'rest', 'pub_sub', 'temporal', 'sqs', 'event_bridge'];
            if(!allowedProviders.includes(eventData.provider)){
                throw new FdkInvalidWebhookConfig(`Invalid provider value in webhook event ${eventName}, allowed values are ${allowedProviders.toString()}`);
            }
            if(eventData.provider === 'rest' && !eventData.hasOwnProperty("handler")){
                throw new FdkInvalidWebhookConfig(`Missing handler in webhook event ${eventName}`);
            }
            else if((eventData.provider === 'kafka' || eventData.provider === 'pub_sub' ) && !eventData.hasOwnProperty("topic")){
                throw new FdkInvalidWebhookConfig(`Missing topic in webhook event ${eventName}`);
            }else if((eventData.provider === 'temporal' || eventData.provider === 'sqs' )&& !eventData.hasOwnProperty("queue")){
                throw new FdkInvalidWebhookConfig(`Missing queue in webhook event ${eventName}`);
            }else if(eventData.provider === 'temporal' && !eventData.hasOwnProperty("workflow_name")){
                throw new FdkInvalidWebhookConfig(`Missing workflow_name in webhook event ${eventName}`);
            }else if(eventData.provider === 'event_bridge' && !eventData.hasOwnProperty("event_bridge_name")){
                throw new FdkInvalidWebhookConfig(`Missing event_bridge_name in webhook event ${eventName}`);
            }

            if("filters" in eventData && typeof eventData.filters != 'object'){
                throw new FdkInvalidWebhookConfig(`filters should be an object in webhook event ${eventName}`);
            }

            if("reducer" in eventData && typeof eventData.reducer != 'object'){
                throw new FdkInvalidWebhookConfig(`reducer should be an object in webhook event ${eventName}`);
            }

            this._eventMap[eventData.provider][eventName + '/v' + eventData.version] = eventData;
        }

        let allEventMap = {...this._eventMap.rest,
            ...this._eventMap.kafka,
            ...this._eventMap.sqs,
            ...this._eventMap.pub_sub,
            ...this._eventMap.temporal,
            ...this._eventMap.event_bridge};
        // get event config for required event_map in eventConfig.event_configs
        await this.getEventConfig(allEventMap);     
        // generate eventIdMap from eventConfig.event_configs                                        
        eventConfig.eventsMap = this._getEventIdMap(eventConfig.event_configs);               
        this._validateEventsMap(allEventMap);
        
        if(Object.keys(eventConfig.eventsNotFound).length){
            let errors = []
            Object.keys(eventConfig.eventsNotFound).forEach((key)=>{
                errors.push(`name: ${key}, version: ${eventConfig.eventsNotFound[key]}`) 
            })
            throw new FdkInvalidWebhookConfig(`Webhooks events ${errors.join(' and ')} not found`);
        }
        logger.debug('Webhook registry initialized');
    }

    get isInitialized() {
        return !!this._eventMap;
    }

    get isSubscribeOnInstall(){
        return this._config.subscribe_on_install
    }

    _validateEventsMap(handlerConfig) {
        delete eventConfig.eventsNotFound
        eventConfig.eventsNotFound = {}
        Object.keys(handlerConfig).forEach((key) => {
            if(!eventConfig.eventsMap.hasOwnProperty(key)){
                eventConfig.eventsNotFound[key.substring(0, key.lastIndexOf('/'))] = handlerConfig[key].version            
            }
        })
    }

    _getEventIdMap(events) {
        return events.reduce((event_map, event) => {
            event_map[`${event.event_category}/${event.event_name}/${event.event_type}/v${event.version}`] = event.id;
            return event_map;
        }, {});
    }

    _associationCriteria(applicationIdList) {
        if (this._config.subscribed_saleschannel === 'specific') {
            return applicationIdList.length ? ASSOCIATION_CRITERIA.SPECIFIC : ASSOCIATION_CRITERIA.EMPTY;
        }
        return ASSOCIATION_CRITERIA.ALL;
    }

    get _webhookUrl() {
        return `${this._fdkConfig.base_url}${this._config.api_path}`;
    }

    async syncEvents(platformClient, config = null, enableWebhooks) {
        if (config) {
            await this.initialize(config, this._fdkConfig);
        }
        if (!this.isInitialized){
            throw new FdkInvalidWebhookConfig('Webhook registry not initialized');
        }
        logger.debug('Webhook sync events started');
        await this.syncSubscriberConfigForAllProviders(platformClient, enableWebhooks);
    }

    /* this will call the v3.0 upsert put api which will handle syncing in a single api call. */
    async syncSubscriberConfigForAllProviders(platformClient, enableWebhooks){
        let payload = this.createRegisterPayloadData(enableWebhooks);
        const uniqueKey = `registerSubscriberToEventForAllProvider_${platformClient.config.companyId}_${this._fdkConfig.api_key}`;
        const token = await platformClient.config.oauthClient.getAccessToken();
        const retryInfo = this._retryManager.retryInfoMap.get(uniqueKey);
        if (retryInfo && !retryInfo.isRetry) {
            this._retryManager.resetRetryState(uniqueKey);
        }
        try {
            const rawRequest = {
                method: "put",
                url: `${this._fdkConfig.cluster}/service/platform/webhook/v3.0/company/${platformClient.config.companyId}/subscriber`,
                data: payload,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "x-ext-lib-version": `js/${version}`
                }
            }
            await fdkAxios.request(rawRequest);
            return true;
        } catch(err) {
            if (
                RetryManger.shouldRetryOnError(err)
                && !this._retryManager.isRetryInProgress(uniqueKey)
            ) {
                return await this._retryManager.retry(
                    uniqueKey, 
                    this.syncSubscriberConfigForAllProviders.bind(this),
                    platformClient,
                    enableWebhooks
                );
            }
            throw new FdkWebhookRegistrationError(`Error while updating webhook subscriber configuration for all providers. Reason: ${err.message}. Errors: ${JSON.stringify(err?.details)}`);
        }

    }

    createRegisterPayloadData(enableWebhooks){
        const applicationIds = Array.isArray(this._config.subscribed_saleschannel_ids)
            ? this._config.subscribed_saleschannel_ids
            : [];
        let payload = {
            "webhook_config": {
                notification_email: this._config.notification_email,
                name: this._fdkConfig.api_key,
                association: {
                    "extension_id": this._fdkConfig.api_key,
                    "application_id": applicationIds,
                    "criteria": this._associationCriteria(applicationIds)
                },
                status: enableWebhooks === undefined ? "active" : (enableWebhooks ? "active" : "inactive"),
                event_map: {

                }
            }
        };  

        let payloadEventMap = payload.webhook_config.event_map;
        for(let [key, event] of Object.entries(this._config.event_map)) {
            if(!payloadEventMap[event.provider]){
                payloadEventMap[event.provider] = {}
                if(payload.webhook_config?.association?.criteria == ASSOCIATION_CRITERIA.SPECIFIC){
                    payloadEventMap[event.provider] = {
                        type: this._config.marketplace ? 'marketplace' : null
                    }
                }
                payloadEventMap[event.provider].events = []
                if(event.provider == 'rest'){
                    payloadEventMap[event.provider] = {
                        ...payloadEventMap[event.provider],
                        webhook_url: this._webhookUrl,
                        auth_meta: {
                            type: 'hmac',
                            secret: this._fdkConfig.api_secret
                        }
                    }
                }

            }
            let [event_category, event_name, event_type] = key.split('/');
            let eventData = {
                event_category,
                event_name,
                event_type,
                version: event.version,
                topic: event.topic,
                queue: event.queue,
                workflow_name: event.workflow_name,
                event_bridge_name: event.event_bridge_name,
                filters: event.filters,
                reducer: event.reducer
            };
            payloadEventMap[event.provider].events.push(eventData);
        };
    verifySignature(req) {
        const reqSignature = req.headers['x-fp-signature'];
        const { body } = req;
        const calcSignature = hmacSHA256(JSON.stringify(body), this._fdkConfig.api_secret).toString();
        if (reqSignature !== calcSignature) {
            throw new FdkInvalidHMacError(`Signature passed does not match calculated body signature`);
        }
    }

    async processWebhook(req) {
        if (!this.isInitialized){
            await this.initialize(this._config, this._fdkConfig);
        }
        try {
            const { body } = req;
            if (body.event.name === TEST_WEBHOOK_EVENT_NAME) {
                return;
            }
            this.verifySignature(req);

            const eventName = `${body.event.category}/${body.event.name}/${body.event.type}/v${body.event.version}`;

            const eventHandlerMap = (this._eventMap.rest[eventName] || {});
            const extHandler = eventHandlerMap.handler;

            if (typeof extHandler === 'function') {
                logger.debug(`Webhook event received for company: ${req.body.company_id}, application: ${req.body.application_id || ''}, event name: ${eventName}`);
                await extHandler(eventName, req.body, req.body.company_id, req.body.application_id);
            }
            else {
                throw new FdkWebhookHandlerNotFound(`Webhook handler not assigned: ${eventName}`);
            }
        }
        catch (err) {
            throw new FdkWebhookProcessError(err.message);
        }
    }


    async getEventConfig(handlerConfig) {
        let url = `${this._fdkConfig.cluster}/service/common/webhook/v1.0/events/query-event-details`;
        const uniqueKey = `${url}_${this._fdkConfig.api_key}`;

        const retryInfo = this._retryManager.retryInfoMap.get(uniqueKey);

        if (retryInfo && !retryInfo.isRetry) {
            this._retryManager.resetRetryState(uniqueKey);
        }

        try {
            let data = [];
            Object.keys(handlerConfig).forEach((key) => {
                let eventObj = {}
                let eventDetails = key.split('/');
                eventObj.event_category = eventDetails[0]
                eventObj.event_name = eventDetails[1];
                eventObj.event_type = eventDetails[2];
                eventObj.version = handlerConfig[key].version;
                data.push(eventObj);
            });
            
            const rawRequest = {
                method: "post",
                url: url,
                data: data,
                headers: {
                    "Content-Type": "application/json",
                    "x-ext-lib-version": `js/${version}`
                },
            };
            let responseData = await fdkAxios.request(rawRequest);
            eventConfig.event_configs = responseData.event_configs;
            logger.debug(`Webhook events config received: ${logger.safeStringify(responseData)}`);
            return responseData;            
        }
        catch (err) {

            if (
                RetryManger.shouldRetryOnError(err)
                && !this._retryManager.isRetryInProgress(uniqueKey)
            ) {
                return await this._retryManager.retry(uniqueKey, this.getEventConfig.bind(this), handlerConfig);
            }

            throw new FdkInvalidWebhookConfig(`Error while fetching webhook events configuration, Reason: ${err.message}`)
        }
    }
}

module.exports = {
    WebhookRegistry
}
