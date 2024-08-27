import BaseStorage = require("../../storage/base_storage");
import MemoryStorage = require("../../storage/memory_storage");
import RedisStorage = require("../../storage/redis_storage");
import SQLiteStorage = require("./sqlite_storage");
export { BaseStorage, MemoryStorage, RedisStorage, SQLiteStorage };
