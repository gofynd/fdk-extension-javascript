export function setupFdk(data: any, syncInitialization: any): {
    fdkHandler: any;
    extension: {
        api_key: any;
        api_secret: any;
        storage: any;
        base_url: any;
        callbacks: any;
        access_mode: any;
        cluster: string;
        webhookRegistry: import("./lib/webhook").WebhookRegistry | null;
        _isInitialized: boolean;
        _retryManager: import("./lib/retry_manager").RetryManger;
        configData: any;
        initialize(data: any): Promise<void>;
        scopes: any;
        readonly isInitialized: boolean;
        verifyScopes(scopes: any, extensionData: any): any;
        getAuthCallback(): any;
        isOnlineAccessMode(): boolean;
        getPlatformConfig(companyId: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformConfig")>;
        getPlatformClient(companyId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
        getPartnerConfig(organizationId: any): import("@gofynd/fdk-client-javascript/sdk/partner/PartnerConfig");
        getPartnerClient(organizationId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/partner/PartnerClient")>;
        getExtensionDetails(): any;
        extensionData: any;
    };
    apiRoutes: any;
    webhookRegistry: import("./lib/webhook").WebhookRegistry | null;
    applicationProxyRoutes: any;
    partnerApiRoutes: any;
    platformApiRoutes: any;
    getPlatformClient: typeof getPlatformClient;
    getPartnerClient: typeof getPartnerClient;
    getApplicationClient: typeof getApplicationClient;
    getSessionData: typeof getSessionData;
    getApplicationConfig: typeof getApplicationConfig;
    getUserData: typeof getUserData;
    routerHandlers: {
        fpAuth: (reqObj: any, state: any, code: any, ext: any, sessionId: any) => Promise<{
            redirectUrl: any;
            fdkSession: any;
        }>;
        fpInstall: (company_id: any, application_id: any, redirect_path: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("./lib/session/session");
        }>;
        fpAutoInstall: (reqObj: any, company_id: any, code: any, ext: any) => Promise<void>;
        fpUninstall: (reqObj: any, company_id: any, ext: any) => Promise<void>;
        admInstall: (organization_id: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("./lib/session/session");
        }>;
        admAuth: (state: any, code: any, ext: any, sessionId: any) => Promise<{
            redirectUrl: any;
            fdkSession: any;
        }>;
    };
} | Promise<{
    fdkHandler: any;
    extension: {
        api_key: any;
        api_secret: any;
        storage: any;
        base_url: any;
        callbacks: any;
        access_mode: any;
        cluster: string;
        webhookRegistry: import("./lib/webhook").WebhookRegistry | null;
        _isInitialized: boolean;
        _retryManager: import("./lib/retry_manager").RetryManger;
        configData: any;
        initialize(data: any): Promise<void>;
        scopes: any;
        readonly isInitialized: boolean;
        verifyScopes(scopes: any, extensionData: any): any;
        getAuthCallback(): any;
        isOnlineAccessMode(): boolean;
        getPlatformConfig(companyId: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformConfig")>;
        getPlatformClient(companyId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
        getPartnerConfig(organizationId: any): import("@gofynd/fdk-client-javascript/sdk/partner/PartnerConfig");
        getPartnerClient(organizationId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/partner/PartnerClient")>;
        getExtensionDetails(): any;
        extensionData: any;
    };
    apiRoutes: any;
    webhookRegistry: import("./lib/webhook").WebhookRegistry | null;
    applicationProxyRoutes: any;
    partnerApiRoutes: any;
    platformApiRoutes: any;
    getPlatformClient: typeof getPlatformClient;
    getPartnerClient: typeof getPartnerClient;
    getApplicationClient: typeof getApplicationClient;
    getSessionData: typeof getSessionData;
    getApplicationConfig: typeof getApplicationConfig;
    getUserData: typeof getUserData;
    routerHandlers: {
        fpAuth: (reqObj: any, state: any, code: any, ext: any, sessionId: any) => Promise<{
            redirectUrl: any;
            fdkSession: any;
        }>;
        fpInstall: (company_id: any, application_id: any, redirect_path: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("./lib/session/session");
        }>;
        fpAutoInstall: (reqObj: any, company_id: any, code: any, ext: any) => Promise<void>;
        fpUninstall: (reqObj: any, company_id: any, ext: any) => Promise<void>;
        admInstall: (organization_id: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("./lib/session/session");
        }>;
        admAuth: (state: any, code: any, ext: any, sessionId: any) => Promise<{
            redirectUrl: any;
            fdkSession: any;
        }>;
    };
}>;
import { getPlatformClient } from "./lib/utils";
import { getPartnerClient } from "./lib/utils";
import { getApplicationClient } from "./lib/utils";
import { getSessionData } from "./lib/utils";
import { getApplicationConfig } from "./lib/utils";
import { getUserData } from "./lib/utils";
