export = SessionStorage;
declare class SessionStorage {
    static saveSession(session: any): Promise<any>;
    static getSession(sessionId: any): Promise<any>;
    static deleteSession(sessionId: any): Promise<any>;
}
