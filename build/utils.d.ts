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
export function getApplicationClient(applicationId: any, applicationToken: any): Promise<import("@gofynd/fdk-client-javascript/sdk/application/ApplicationClient")>;
