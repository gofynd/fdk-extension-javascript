/// <reference types="node" />
export function setupFdk(data: any, syncInitialization: any): {
    fdkHandler: typeof setupRoutes;
    extension: {
        api_key: any;
        api_secret: any;
        storage: any;
        base_url: any;
        callbacks: any;
        access_mode: any;
        cluster: string;
        webhookRegistry: import("../webhook").WebhookRegistry;
        _isInitialized: boolean;
        _retryManager: import("../retry_manager").RetryManger;
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
        getExtensionDetails(): Promise<any>;
        extensionData: import("axios").AxiosResponse<any, any>;
    };
    webhookRegistry: import("../webhook").WebhookRegistry;
    applicationProxyRoutes: (fastify: import("fastify").FastifyInstance<import("http").Server, import("http").IncomingMessage, import("http").ServerResponse, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, options: Record<never, never>, done: (err?: Error) => void) => void;
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
        fpInstall: (company_id: any, application_id: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("../session/session");
        }>;
        fpAutoInstall: (reqObj: any, company_id: any, code: any, ext: any) => Promise<void>;
        fpUninstall: (reqObj: any, company_id: any, ext: any) => Promise<void>;
        admInstall: (organization_id: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("../session/session");
        }>;
        admAuth: (state: any, code: any, ext: any, sessionId: any) => Promise<{
            redirectUrl: any;
            fdkSession: any;
        }>;
    };
} | Promise<{
    fdkHandler: typeof setupRoutes;
    extension: {
        api_key: any;
        api_secret: any;
        storage: any;
        base_url: any;
        callbacks: any;
        access_mode: any;
        cluster: string;
        webhookRegistry: import("../webhook").WebhookRegistry;
        _isInitialized: boolean;
        _retryManager: import("../retry_manager").RetryManger;
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
        getExtensionDetails(): Promise<any>;
        extensionData: import("axios").AxiosResponse<any, any>;
    };
    webhookRegistry: import("../webhook").WebhookRegistry;
    applicationProxyRoutes: (fastify: import("fastify").FastifyInstance<import("http").Server, import("http").IncomingMessage, import("http").ServerResponse, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, options: Record<never, never>, done: (err?: Error) => void) => void;
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
        fpInstall: (company_id: any, application_id: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("../session/session");
        }>;
        fpAutoInstall: (reqObj: any, company_id: any, code: any, ext: any) => Promise<void>;
        fpUninstall: (reqObj: any, company_id: any, ext: any) => Promise<void>;
        admInstall: (organization_id: any, ext: any) => Promise<{
            redirectUrl: any;
            fdkSession: import("../session/session");
        }>;
        admAuth: (state: any, code: any, ext: any, sessionId: any) => Promise<{
            redirectUrl: any;
            fdkSession: any;
        }>;
    };
}>;
import setupRoutes = require("./routes");
import { getPlatformClient } from "../utils";
import { getPartnerClient } from "../utils";
import { getApplicationClient } from "../utils";
import { getSessionData } from "../utils";
import { getApplicationConfig } from "../utils";
import { getUserData } from "../utils";