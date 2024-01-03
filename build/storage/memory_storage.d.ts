export = MemoryStorage;
declare class MemoryStorage extends BaseStorage {
    __data: {};
    get(key: any): Promise<any>;
    hget(key: any, hashKey: any): Promise<any>;
    hgetall(key: any): Promise<any>;
}
import BaseStorage = require("./base_storage");
