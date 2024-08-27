export = SQLiteStorage;
declare class SQLiteStorage extends BaseStorage {
    constructor(dbClient: any, prefixKey: any);
    dbClient: any;
    ttlCheckerInterval: NodeJS.Timer;
    initializeTable(): Promise<void>;
    setupTTLChecker(): void;
    get(key: any): Promise<any>;
    set(key: any, value: any): Promise<any>;
    setex(key: any, value: any, ttl: any): Promise<any>;
    del(key: any): Promise<any>;
}
import BaseStorage = require("../../storage/base_storage");
