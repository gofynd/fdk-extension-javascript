export function extAuth(reqObj: any, state: any, code: any, ext: any, sessionId: any): Promise<{
    redirectUrl: any;
    fdkSession: any;
}>;
export function extInstall(company_id: any, application_id: any, redirect_path: any, ext: any): Promise<{
    redirectUrl: any;
    fdkSession: Session;
}>;
export function extUninstall(reqObj: any, company_id: any, ext: any): Promise<void>;
export function admInstall(organization_id: any, ext: any): Promise<{
    redirectUrl: any;
    fdkSession: Session;
}>;
export function admAuth(state: any, code: any, ext: any, sessionId: any): Promise<{
    redirectUrl: any;
    fdkSession: any;
}>;
import Session = require("../session/session");
