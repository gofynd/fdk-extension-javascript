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
        this._handlerMap = null;
        this._topicMap = null;
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
        if (!config.event_map || !Object.keys(config.event_map).length) {
            throw new FdkInvalidWebhookConfig(`Invalid or missing "event_map"`);
        }
        config.subscribe_on_install = config.subscribe_on_install === undefined ? true : config.subscribe_on_install;
        this._handlerMap = {};
        this._topicMap = {};
        this._config = config;
        this._fdkConfig = fdkConfig;
        const handlerConfig = {};
        const topicConfig = {};
        const eventsConfig = {};
 
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
            }else if(eventData.provider === 'sqs' && !eventData.hasOwnProperty("account_id")){
                throw new FdkInvalidWebhookConfig(`Missing account_id in webhook event ${eventName}`);
            }else if(eventData.provider === 'event_bridge' && !eventData.hasOwnProperty("event_bridge_name")){
                throw new FdkInvalidWebhookConfig(`Missing event_bridge_name in webhook event ${eventName}`);
            }
            if(eventData.provider === 'rest'){
                handlerConfig[eventName + '/v' + eventData.version] = eventData;
            }
            if(eventData.provider === 'kafka'){
                topicConfig[eventName + '/v' + eventData.version] = eventData;
            }
            eventsConfig[eventName + '/v' + eventData.version] = eventData;
        }

        await this.getEventConfig(eventsConfig);                                             // get event config for required event_map in eventConfig.event_configs
        eventConfig.eventsMap = this._getEventIdMap(eventConfig.event_configs);               // generate eventIdMap from eventConfig.event_configs
        this._validateEventsMap(eventsConfig);
        
        if(Object.keys(eventConfig.eventsNotFound).length){
            let errors = []
            Object.keys(eventConfig.eventsNotFound).forEach((key)=>{
                errors.push(`name: ${key}, version: ${eventConfig.eventsNotFound[key]}`) 
            })
            throw new FdkInvalidWebhookConfig(`Webhooks events ${errors.join(' and ')} not found`);
        }
        this._handlerMap = handlerConfig;
        this._topicMap = topicConfig;
        logger.debug('Webhook registry initialized');
    }

    get isInitialized() {
        return !!this._handlerMap || !!this._topicMap;
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

    _isConfigUpdated(subscriberConfig) {
        let updated = false;
        const configCriteria = this._associationCriteria(subscriberConfig.association.application_id);
        if (configCriteria !== subscriberConfig.association.criteria) {
            if (configCriteria === ASSOCIATION_CRITERIA.ALL) {
                subscriberConfig.association.application_id = [];
            }
            logger.debug(`Webhook association criteria updated from ${subscriberConfig.association.criteria} to ${configCriteria}`);
            subscriberConfig.association.criteria = configCriteria;
            updated = true;
        }

        if (this._config.notification_email !== subscriberConfig.email_id) {
            logger.debug(`Webhook notification email updated from ${subscriberConfig.email_id} to ${this._config.notification_email}`);
            subscriberConfig.email_id = this._config.notification_email;
            updated = true;
        }

        if (subscriberConfig.provider === 'rest' && this._webhookUrl !== subscriberConfig.webhook_url) {
            logger.debug(`Webhook url updated from ${subscriberConfig.webhook_url} to ${this._webhookUrl}`);
            subscriberConfig.webhook_url = this._webhookUrl;
            updated = true;
        }
        return updated;
    }

    async syncEvents(platformClient, config = null, enableWebhooks) {
        if (config) {
            await this.initialize(config, this._fdkConfig);
        }
        if (!this.isInitialized){
            throw new FdkInvalidWebhookConfig('Webhook registry not initialized');
        }
        logger.debug('Webhook sync events started');
        let subscriberConfigList = await this.getSubscriberConfig(platformClient);
        console.log(subscriberConfigList);

        let subscriberSyncedForAllProvider = await this.syncSubscriberConfigForAllProviders(platformClient);

        subscriberConfigList = await this.getSubscriberConfig(platformClient);

        // v3.0 upsert put api does not exist
        if(!subscriberSyncedForAllProvider){
            let subscriberConfigList = await this.getSubscriberConfig(platformClient);
            await this.syncSubscriberConfig(subscriberConfigList.rest, 'rest', this._handlerMap, platformClient, enableWebhooks);
            await this.syncSubscriberConfig(subscriberConfigList.kafka, 'kafka', this._topicMap, platformClient, enableWebhooks);
        }

    }

    /* this will call the v3.0 upsert put api which will handle syncing in a single api call.
    In case the api does not exist we need to fallback to v2.0 api */
    async syncSubscriberConfigForAllProviders(platformClient){
        let payload = this.createRegisterPayloadData();
        const uniqueKey = `registerSubscriberToEventForAllProvider_${platformClient.config.companyId}_${this._fdkConfig.api_key}`;
        const token = await platformClient.config.oauthClient.getAccessToken();
        const retryInfo = this._retryManager.retryInfoMap.get(uniqueKey);
        if (retryInfo && !retryInfo.isRetry) {
            this._retryManager.resetRetryState(uniqueKey);
        }
        try {
            try{
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
                let response = await fdkAxios.request(rawRequest);
                return true;
            }
            catch(err){
                if(err.code != '404'){
                    throw err;
                }
                return false;
            }
        } catch(err) {
            if (
                RetryManger.shouldRetryOnError(err)
                && !this._retryManager.isRetryInProgress(uniqueKey)
            ) {
                return await this._retryManager.retry(
                    uniqueKey, 
                    this.syncSubscriberConfigForAllProviders.bind(this),
                    platformClient
                );
            }
            throw new FdkWebhookRegistrationError(`Error while updating webhook subscriber configuration for all providers. Reason: ${err.message}`);
        }

    }

    createRegisterPayloadData(){
        let payload = {
            "webhook_config": {
                notification_email: this._config.notification_email,
                name: this._fdkConfig.api_key,
                association: {
                    "extension_id": this._fdkConfig.api_key,
                    "application_id": [],
                    "criteria": this._associationCriteria([])
                },
                status: "active",
                event_map: {

                }
            }
        };
        let payloadEventMap = payload.webhook_config.event_map;
        for(let [key, event] of Object.entries(this._config.event_map)) {
            if(!payloadEventMap[event.provider]){
                payloadEventMap[event.provider] = {}
                payloadEventMap[event.provider].events = []
                if(event.provider == 'rest'){
                    payloadEventMap[event.provider] = {
                        ...payloadEventMap[event.provider],
                        webhook_url: this._webhookUrl,
                        auth_meta: {
                            secret: this._fdkConfig.api_secret
                        }
                    }
                }

            }
            let eventData = {}
                let eventDetailsFromKey = key.split('/')
                eventData.event_category = eventDetailsFromKey[0]
                eventData.event_name = eventDetailsFromKey[1]
                eventData.event_type = eventDetailsFromKey[2]
                eventData = {
                    ...eventData, 
                    version: event.version,
                    topic: event.topic,
                    queue: event.queue,
                    workflow_name: event.workflow_name,
                    account_id: event.account_id,
                    event_bridge_name: event.event_bridge_name
                };
                payloadEventMap[event.provider].events.push(eventData);
        };
        return payload;
    }

    async syncSubscriberConfig(subscriberConfig, configType, currentEventMapConfig, platformClient, enableWebhooks){
            
        let registerNew = false;
        let configUpdated = false;
        let existingEvents = [];

        if (!subscriberConfig) {
            subscriberConfig = {
                "name": this._fdkConfig.api_key,
                "association": {
                    "company_id": platformClient.config.companyId,
                    "application_id": [],
                    "criteria": this._associationCriteria([])
                },
                "status": "active",
                "auth_meta": {
                    "type": "hmac",
                    "secret": this._fdkConfig.api_secret
                }, 
                "events": [],
                "provider": configType,
                "email_id": this._config.notification_email
            }
            if(configType === 'rest'){
                subscriberConfig['webhook_url'] = this._webhookUrl;
            }
            registerNew = true;
            if (enableWebhooks !== undefined) {
                subscriberConfig.status = enableWebhooks ? 'active' : 'inactive';
            }
        }
        else {
            logger.debug(`Webhook ${configType} config on platform side for company id ${platformClient.config.companyId}: ${JSON.stringify(subscriberConfig)}`)
            const { id, name, webhook_url, provider="rest", association, status, auth_meta, event_configs, email_id } = subscriberConfig
            subscriberConfig = { id, name, webhook_url, provider, association, status, auth_meta, email_id };
            subscriberConfig.events = [];
            existingEvents = event_configs.map(event => {
                return {
                    'slug': `${event.event_category}/${event.event_name}/${event.event_type}/v${event.version}`,
                    'topic': event.subscriber_event_mapping.topic
                }
            });
            // Checking Configuration Updates
            if (provider == 'rest' && (auth_meta.secret !== this._fdkConfig.api_secret)) {
                auth_meta.secret = this._fdkConfig.api_secret;
                configUpdated = true;
            }
            if (enableWebhooks !== undefined) {
                const newStatus = enableWebhooks ? 'active' : 'inactive';
                if(newStatus !== subscriberConfig.status){
                   subscriberConfig.status = newStatus;
                   configUpdated = true;
                }                    
            }
            if (this._isConfigUpdated(subscriberConfig)) {
                configUpdated = true;
            }
        }

        // Adding all events to subscriberConfig if it is valid event
        for (let eventName of Object.keys(currentEventMapConfig)) {
            let event_id = eventConfig.eventsMap[eventName]
            if (event_id) {
                const event = {
                    slug: eventName
                }
                if(currentEventMapConfig[eventName].hasOwnProperty('topic')){
                    event['topic'] = currentEventMapConfig[eventName].topic;
                }
                subscriberConfig.events.push(event);
            }
        }

        try {
            if (registerNew) {
                if(subscriberConfig.events.length == 0){
                    logger.debug(`Skipped registerSubscriber API call as no ${configType} based events found`);
                    return;
                }
                await this.registerSubscriberConfig(platformClient, subscriberConfig);
                if (this._fdkConfig.debug) {
                    subscriberConfig.events = subscriberConfig.events.map(event => event.slug);
                    logger.debug(`Webhook ${configType} config registered for company: ${platformClient.config.companyId}, config: ${JSON.stringify(subscriberConfig)}`);
                }
            }
            else {
                const eventDiff = [
                    ...subscriberConfig.events.filter(event => !existingEvents.find(item => item.slug === event.slug)),
                    ...existingEvents.filter(event => !subscriberConfig.events.find(item => item.slug === event.slug))
                ]

                // Check if only topic is changed for same kafka events
                if(configType === 'kafka' && !configUpdated){
                    for(const event of subscriberConfig.events){
                        const existingEvent = existingEvents.find(e => e.slug === event.slug);
                        if(existingEvent && !(event.topic === existingEvent.topic)){
                            configUpdated = true
                            break;
                        }
                    }
                }

                if (eventDiff.length || configUpdated) {
                    await this.updateSubscriberConfig(platformClient, subscriberConfig);
                    if (this._fdkConfig.debug) {
                        subscriberConfig.events = subscriberConfig.events?.map(event => event.slug); 
                        logger.debug(`Webhook ${configType} config updated for company: ${platformClient.config.companyId}, config: ${JSON.stringify(subscriberConfig)}`);
                    }
                }
            }
        }
        catch (ex) {
            throw new FdkWebhookRegistrationError(`Failed to sync webhook ${configType} events. Reason: ${ex.message}`);
        }
    }

    async enableSalesChannelWebhook(platformClient, applicationId) {
        if (!this.isInitialized){
            await this.initialize(this._config, this._fdkConfig);
        }
        if (this._config.subscribed_saleschannel !== 'specific') {
            throw new FdkWebhookRegistrationError('`subscribed_saleschannel` is not set to `specific` in webhook config');
        }
        try {
            let subscriberConfigList = await this.getSubscriberConfig(platformClient);
            if (Object.keys(subscriberConfigList).length === 0) {
                throw new FdkWebhookRegistrationError(`Subscriber config not found`);
            }
            for(const subscriberConfigType in subscriberConfigList) {
                let subscriberConfig = subscriberConfigList[subscriberConfigType];
                const { id, name, webhook_url, provider="rest", association, status, auth_meta, event_configs, email_id } = subscriberConfig;
                subscriberConfig = { id, name, webhook_url, provider, association, status, auth_meta, email_id };
                subscriberConfig.events = event_configs.map(event => {
                    const eventObj = {
                        slug: `${event.event_category}/${event.event_name}/${event.event_type}/v${event.version}`
                    }
                    if(subscriberConfig.provider === 'kafka'){
                        eventObj['topic'] = event.subscriber_event_mapping.topic
                    }
                    return eventObj;
                });
                const arrApplicationId = subscriberConfig.association.application_id || [];
                const rmIndex = arrApplicationId.indexOf(applicationId);
                if (rmIndex === -1) {
                    arrApplicationId.push(applicationId);
                    subscriberConfig.association.application_id = arrApplicationId;
                    subscriberConfig.association.criteria = this._associationCriteria(subscriberConfig.association.application_id);
                    await this.updateSubscriberConfig(platformClient, subscriberConfig);
                    logger.debug(`Webhook enabled for saleschannel: ${applicationId}`);
                }
            }
        }
        catch (ex) {
            throw new FdkWebhookRegistrationError(`Failed to add saleschannel webhook. Reason: ${ex.message}`);
        }
    }

    async disableSalesChannelWebhook(platformClient, applicationId) {
        if (!this.isInitialized){
            await this.initialize(this._config, this._fdkConfig);
        }
        if (this._config.subscribed_saleschannel !== 'specific') {
            throw new FdkWebhookRegistrationError('`subscribed_saleschannel` is not set to `specific` in webhook config');
        }
        try {
            let subscriberConfigList = await this.getSubscriberConfig(platformClient);
            if (Object.keys(subscriberConfigList).length == 0) {
                throw new FdkWebhookRegistrationError(`Subscriber config not found`);
            }
            for(const subscriberConfigType in subscriberConfigList) {
                let subscriberConfig = subscriberConfigList[subscriberConfigType];
                const { id, name, webhook_url, provider="rest", association, status, auth_meta, event_configs, email_id } = subscriberConfig;
                subscriberConfig = { id, name, webhook_url, provider, association, status, auth_meta, email_id };
                subscriberConfig.events = event_configs.map(event => {
                    const eventObj = {
                        slug: `${event.event_category}/${event.event_name}/${event.event_type}/v${event.version}`
                    }
                    if(subscriberConfig.provider === 'kafka'){
                        eventObj['topic'] = event.subscriber_event_mapping.topic
                    }
                    return eventObj;
                });
                const arrApplicationId = subscriberConfig.association.application_id;
                if (arrApplicationId && arrApplicationId.length) {
                    const rmIndex = arrApplicationId.indexOf(applicationId);
                    if (rmIndex > -1) {
                        arrApplicationId.splice(rmIndex, 1);
                        subscriberConfig.association.criteria = this._associationCriteria(subscriberConfig.association.application_id);
                        await this.updateSubscriberConfig(platformClient, subscriberConfig);
                        logger.debug(`Webhook disabled for saleschannel: ${applicationId}`);
                    }
                }
            }            
        }
        catch (ex) {
            throw new FdkWebhookRegistrationError(`Failed to remove saleschannel webhook. Reason: ${ex.message}`);
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

            const eventHandlerMap = (this._handlerMap[eventName] || {});
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


    async registerSubscriberConfig(platformClient, subscriberConfig) {
        const uniqueKey = `registerSubscriberToEvent_${platformClient.config.companyId}_${this._fdkConfig.api_key}`;
        const token = await platformClient.config.oauthClient.getAccessToken();
        const retryInfo = this._retryManager.retryInfoMap.get(uniqueKey);
        if (retryInfo && !retryInfo.isRetry) {
            this._retryManager.resetRetryState(uniqueKey);
        }

        try {
            try{
                const rawRequest = {
                    method: "post",
                    url: `${this._fdkConfig.cluster}/service/platform/webhook/v2.0/company/${platformClient.config.companyId}/subscriber`,
                    data: subscriberConfig,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "x-ext-lib-version": `js/${version}`
                    }
                }
                return await fdkAxios.request(rawRequest);
            }
            catch(err){
                if(subscriberConfig.provider !== "rest"){
                    logger.debug(`Webhook Subscriber Config type ${subscriberConfig.provider} is not supported with current fp version`)
                    return;
                }
                if(err.code != '404'){
                    throw err;
                }

                const eventsList = subscriberConfig.events;
                delete subscriberConfig.events;
                const provider = subscriberConfig.provider;
                delete subscriberConfig.provider;
                subscriberConfig.event_id = [];
                eventsList.forEach((event) => {
                    subscriberConfig.event_id.push(eventConfig.eventsMap[event.slug]);
                })

                const rawRequest = {
                    method: "post",
                    url: `${this._fdkConfig.cluster}/service/platform/webhook/v1.0/company/${platformClient.config.companyId}/subscriber`,
                    data: subscriberConfig,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "x-ext-lib-version": `js/${version}`
                    }
                }
                const response = await fdkAxios.request(rawRequest);
                subscriberConfig.events = eventsList;
                subscriberConfig.provider = provider;
                return response;
            }
        } catch(err) {
            if (
                RetryManger.shouldRetryOnError(err)
                && !this._retryManager.isRetryInProgress(uniqueKey)
            ) {
                return await this._retryManager.retry(
                    uniqueKey, 
                    this.registerSubscriberConfig.bind(this), 
                    platformClient, 
                    subscriberConfig
                )
            }
            throw new FdkWebhookRegistrationError(`Error while registering webhook subscriber configuration, Reason: ${err.message}`);
        }
        
    }

    async updateSubscriberConfig(platformClient, subscriberConfig) {
        const uniqueKey = `updateSubscriberConfig_${platformClient.config.companyId}_${this._fdkConfig.api_key}`;
        const token = await platformClient.config.oauthClient.getAccessToken();
        const retryInfo = this._retryManager.retryInfoMap.get(uniqueKey);
        if (retryInfo && !retryInfo.isRetry) {
            this._retryManager.resetRetryState(uniqueKey);
        }

        try {
            if(subscriberConfig.events.length == 0){
                subscriberConfig.status = 'inactive';
                delete subscriberConfig.events
            }
            try{
                const rawRequest = {
                    method: "put",
                    url: `${this._fdkConfig.cluster}/service/platform/webhook/v2.0/company/${platformClient.config.companyId}/subscriber`,
                    data: subscriberConfig,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "x-ext-lib-version": `js/${version}`
                    }
                }
                return await fdkAxios.request(rawRequest);
            }
            catch(err){
                if(subscriberConfig.provider !== "rest"){
                    logger.debug(`Webhook Subscriber Config type ${subscriberConfig.provider} is not supported with current fp version`)
                    return;
                }
                if(err.code != '404'){
                    throw err;
                }
                const eventsList = subscriberConfig.events;
                delete subscriberConfig.events;
                const provider = subscriberConfig.provider;
                delete subscriberConfig.provider;
                subscriberConfig.event_id = [];
                eventsList?.forEach((event) => {
                    subscriberConfig.event_id.push(eventConfig.eventsMap[event.slug]);
                })

                const rawRequest = {
                    method: "put",
                    url: `${this._fdkConfig.cluster}/service/platform/webhook/v1.0/company/${platformClient.config.companyId}/subscriber`,
                    data: subscriberConfig,
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                        "x-ext-lib-version": `js/${version}`
                    }
                }
                const response = await fdkAxios.request(rawRequest);
                subscriberConfig.events = eventsList;
                subscriberConfig.provider = provider;
                return response;
            }
        } catch(err) {
            if (
                RetryManger.shouldRetryOnError(err)
                && !this._retryManager.isRetryInProgress(uniqueKey)
            ) {
                return await this._retryManager.retry(
                    uniqueKey, 
                    this.updateSubscriberConfig.bind(this),
                    platformClient, 
                    subscriberConfig
                );
            }
            throw new FdkWebhookRegistrationError(`Error while updating webhook subscriber configuration. Reason: ${err.message}`);
        }
    }

    async getSubscriberConfig(platformClient) {
        const uniqueKey = `getSubscribersByExtensionId_${platformClient.config.companyId}_${this._fdkConfig.api_key}`;
        const token = await platformClient.config.oauthClient.getAccessToken();
        const retryInfo = this._retryManager.retryInfoMap.get(uniqueKey);
        if (retryInfo && !retryInfo.isRetry) {
            this._retryManager.resetRetryState(uniqueKey);
        }

        try {
            const rawRequest = {
                method: "get",
                url: `${this._fdkConfig.cluster}/service/platform/webhook/v1.0/company/${platformClient.config.companyId}/extension/${this._fdkConfig.api_key}/subscriber`,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "x-ext-lib-version": `js/${version}`
                }
            }
            const subscriberConfigResponse = await fdkAxios.request(rawRequest);
            
            const subscriberConfig = {};
            subscriberConfigResponse.items.forEach((config) => {
                if(config.provider === 'kafka'){
                    subscriberConfig['kafka'] = config;
                }
                else{
                    subscriberConfig['rest'] = config;
                }
            })

            return subscriberConfig;
        }
        catch(err){
            if (
                RetryManger.shouldRetryOnError(err)
                && !this._retryManager.isRetryInProgress(uniqueKey)
            ) {
                return await this._retryManager.retry(
                    uniqueKey, 
                    this.getSubscriberConfig.bind(this), 
                    platformClient
                );
            }
            throw new FdkInvalidWebhookConfig(`Error while fetching webhook subscriber configuration, Reason: ${err.message}`);
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