export = RedisStorage;
declare class RedisStorage extends BaseStorage {
    constructor(client: any, prefixKey: any);
    client: any;
    get(key: any): Promise<any>;
    set(key: any, value: any): Promise<any>;
    setex(key: any, value: any, ttl: any): Promise<any>;
    hget(key: any, hashKey: any): Promise<any>;
    hset(key: any, hashKey: any, value: any): Promise<any>;
    hgetall(key: any): Promise<any>;
}
import BaseStorage = require("./base_storage");
