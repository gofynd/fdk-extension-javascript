export const extension: Extension;
declare class Extension {
    api_key: any;
    api_secret: any;
    storage: any;
    base_url: any;
    callbacks: any;
    access_mode: any;
    cluster: string;
    webhookRegistry: WebhookRegistry | null;
    _isInitialized: boolean;
    _retryManager: RetryManger;
    configData: any;
    initialize(data: any): Promise<void>;
    scopes: any;
    get isInitialized(): boolean;
    verifyScopes(scopes: any, extensionData: any): any;
    getAuthCallback(): any;
    isOnlineAccessMode(): boolean;
    getPlatformConfig(companyId: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformConfig")>;
    getPlatformClient(companyId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
    getPartnerConfig(organizationId: any): import("@gofynd/fdk-client-javascript/sdk/partner/PartnerConfig");
    getPartnerClient(organizationId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/partner/PartnerClient")>;
    getExtensionDetails(): any;
    extensionData: any;
}
import { WebhookRegistry } from "./webhook";
import { RetryManger } from "./retry_manager";
export {};
