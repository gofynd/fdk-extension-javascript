export class WebhookRegistry {
    constructor(retryManager: any);
    _handlerMap: {} | null;
    _topicMap: {} | null;
    _config: any;
    _fdkConfig: any;
    _retryManager: any;
    initialize(config: any, fdkConfig: any): Promise<void>;
    get isInitialized(): boolean;
    get isSubscribeOnInstall(): any;
    _validateEventsMap(handlerConfig: any): void;
    _getEventIdMap(events: any): any;
    _associationCriteria(applicationIdList: any): string;
    get _webhookUrl(): string;
    _isConfigUpdated(subscriberConfig: any): boolean;
    syncEvents(platformClient: any, config: null | undefined, enableWebhooks: any): Promise<void>;
    syncSubscriberConfig(subscriberConfig: any, configType: any, currentEventMapConfig: any, platformClient: any, enableWebhooks: any): Promise<void>;
    enableSalesChannelWebhook(platformClient: any, applicationId: any): Promise<void>;
    disableSalesChannelWebhook(platformClient: any, applicationId: any): Promise<void>;
    verifySignature(body: any, headers: any): void;
    processWebhook({ body, headers }: {
        body: any;
        headers: any;
    }): Promise<void>;
    registerSubscriberConfig(platformClient: any, subscriberConfig: any): any;
    updateSubscriberConfig(platformClient: any, subscriberConfig: any): any;
    getSubscriberConfig(platformClient: any): any;
    getEventConfig(handlerConfig: any): any;
}
