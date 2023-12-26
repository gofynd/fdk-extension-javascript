export function isAuthorized(session_id: any): Promise<any>;
export function sessionMiddleware(strict: any): (req: any, res: any, next: any) => Promise<any>;
export function getApplicationConfig(userData: any, applicationData: any, extension: any): Promise<{
    user: any;
    application: any;
    applicationConfig: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationConfig");
    applicationClient: import("@gofynd/fdk-client-javascript/sdk/application/ApplicationClient");
}>;
