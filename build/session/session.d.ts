export = Session;
declare class Session {
    static cloneSession(id: any, session: any, isNew?: boolean): Session;
    static generateSessionId(isOnline: any, options: any): any;
    constructor(id: any, isNew?: boolean);
    id: any;
    company_id: any;
    state: any;
    scope: any;
    expires: any;
    expires_in: any;
    access_token_validity: any;
    access_mode: string;
    access_token: any;
    current_user: any;
    refresh_token: any;
    isNew: boolean;
    extension_id: any;
    toJSON(): {
        company_id: any;
        state: any;
        scope: any;
        expires: any;
        access_mode: string;
        access_token: any;
        current_user: any;
        refresh_token: any;
        expires_in: any;
        extension_id: any;
        access_token_validity: any;
    };
    updateToken(rawToken: any): void;
}
