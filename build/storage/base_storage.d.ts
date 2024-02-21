export = BaseStorage;
declare class BaseStorage {
    constructor(prefixKey: any);
    prefixKey: string;
    get(key: any): Promise<void>;
    set(key: any, value: any): Promise<void>;
    del(key: any): Promise<void>;
    setex(key: any, value: any, ttl: any): Promise<void>;
    hget(key: any, hashKey: any): Promise<void>;
    hset(key: any, hashKey: any, value: any): Promise<void>;
    hgetall(key: any): Promise<void>;
}
