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
        initialize(data: any): Promise<void>;
        scopes: any;
        readonly isInitialized: boolean;
        verifyScopes(scopes: any, extensionData: any): any;
        getAuthCallback(): any;
        isOnlineAccessMode(): boolean;
        getPlatformConfig(companyId: any): import("@gofynd/fdk-client-javascript/sdk/platform/PlatformConfig");
        getPlatformClient(companyId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
        getExtensionDetails(): Promise<any>;
    };
    webhookRegistry: import("../webhook").WebhookRegistry;
    applicationProxyRoutes: (fastify: import("fastify").FastifyInstance<import("http").Server, import("http").IncomingMessage, import("http").ServerResponse, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, options: Record<never, never>, done: (err?: Error) => void) => void;
    getPlatformClient: typeof getPlatformClient;
    getApplicationClient: typeof getApplicationClient;
    middlewares: {
        isAuthorized: (session_id: any) => Promise<any>;
        getApplicationConfig: (userData: any, applicationData: any, extension: any) => Promise<{
            user: any;
            application: any;
            applicationConfig: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationConfig");
            applicationClient: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationClient");
        }>;
    };
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
        initialize(data: any): Promise<void>;
        scopes: any;
        readonly isInitialized: boolean;
        verifyScopes(scopes: any, extensionData: any): any;
        getAuthCallback(): any;
        isOnlineAccessMode(): boolean;
        getPlatformConfig(companyId: any): import("@gofynd/fdk-client-javascript/sdk/platform/PlatformConfig");
        getPlatformClient(companyId: any, session: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
        getExtensionDetails(): Promise<any>;
    };
    webhookRegistry: import("../webhook").WebhookRegistry;
    applicationProxyRoutes: (fastify: import("fastify").FastifyInstance<import("http").Server, import("http").IncomingMessage, import("http").ServerResponse, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, options: Record<never, never>, done: (err?: Error) => void) => void;
    getPlatformClient: typeof getPlatformClient;
    getApplicationClient: typeof getApplicationClient;
    middlewares: {
        isAuthorized: (session_id: any) => Promise<any>;
        getApplicationConfig: (userData: any, applicationData: any, extension: any) => Promise<{
            user: any;
            application: any;
            applicationConfig: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationConfig");
            applicationClient: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationClient");
        }>;
    };
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
    };
}>;
import setupRoutes = require("./routes");
import { getPlatformClient } from "../utils";
import { getApplicationClient } from "../utils";
