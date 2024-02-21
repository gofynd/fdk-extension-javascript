export function fpAuth(reqObj: any, state: any, code: any, ext: any, sessionId: any): Promise<{
    redirectUrl: any;
    fdkSession: any;
}>;
export function fpInstall(company_id: any, application_id: any, ext: any): Promise<{
    redirectUrl: any;
    fdkSession: Session;
}>;
export function fpAutoInstall(reqObj: any, company_id: any, code: any, ext: any): Promise<void>;
export function fpUninstall(reqObj: any, company_id: any, ext: any): Promise<void>;
export function admInstall(organization_id: any, ext: any): Promise<{
    redirectUrl: any;
    fdkSession: Session;
}>;
export function admAuth(state: any, code: any, ext: any, sessionId: any): Promise<{
    redirectUrl: any;
    fdkSession: any;
}>;
import Session = require("../session/session");
