export const extension: Extension;
declare class Extension {
    api_key: any;
    api_secret: any;
    storage: any;
    base_url: any;
    callbacks: any;
    access_mode: any;
    cluster: string;
    webhookRegistry: WebhookRegistry;
    _isInitialized: boolean;
    initialize(data: any): Promise<void>;
    scopes: any;
    get isInitialized(): boolean;
    verifyScopes(scopes: any, extensionData: any): any;
    getAuthCallback(): any;
    isOnlineAccessMode(): boolean;
    getPlatformConfig(companyId: any): import("@gofynd/fdk-client-javascript/sdk/platform/PlatformConfig");
    getPlatformClient(companyId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
    getExtensionDetails(): Promise<any>;
}
import { WebhookRegistry } from "./webhook";
export {};
