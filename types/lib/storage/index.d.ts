import BaseStorage = require("./base_storage");
import MemoryStorage = require("./memory_storage");
import RedisStorage = require("./redis_storage");
import SQLiteStorage = require("../../lib/storage/sqlite_storage");
export { BaseStorage, MemoryStorage, RedisStorage, SQLiteStorage };
