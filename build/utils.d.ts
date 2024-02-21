export function formRequestObject(req: any): {
    body: any;
    query: any;
    headers: any;
    extension: any;
    fdkSession: any;
    signedCookies: any;
    params: any;
};
export function getPlatformClient(companyId: any, sessionId: any): Promise<import("@gofynd/fdk-client-javascript/sdk/platform/PlatformClient")>;
export function getPartnerClient(organizationId: any, sessionId: any): Promise<import("@gofynd/fdk-client-javascript/sdk/partner/PartnerClient")>;
export function getApplicationClient(applicationId: any, applicationToken: any): Promise<import("@gofynd/fdk-client-javascript/sdk/application/ApplicationClient")>;
export function getSessionData(session_id: any): Promise<any>;
export function getApplicationConfig(applicationData: any, extension: any): Promise<{
    application: any;
    applicationConfig: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationConfig");
    applicationClient: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationClient");
}>;
export function getUserData(userData: any): Promise<any>;
