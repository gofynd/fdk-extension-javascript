export class BaseStorage {
  constructor(prefixKey?: string);
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  del(key: string): Promise<unknown>;
  setex(key: string, value: unknown, ttl: number): Promise<unknown>;
}

export class MemoryStorage extends BaseStorage {}

export class RedisStorage extends BaseStorage {
  constructor(client: unknown, prefixKey?: string);
}

export class SQLiteStorage extends BaseStorage {
  constructor(dbPath: string, prefixKey?: string);
}

export class MultiLevelStorage extends BaseStorage {
  constructor(storages: BaseStorage[], prefixKey?: string);
}
