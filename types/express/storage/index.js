'use strict';
const BaseStorage = require('../../lib/storage/base_storage');
const MemoryStorage = require('../../lib/storage/memory_storage');
const RedisStorage = require('../../lib/storage/redis_storage');
const SQLiteStorage = require('../../lib/storage/sqlite_storage');
module.exports = {
    BaseStorage,
    MemoryStorage,
    RedisStorage,
    SQLiteStorage
};
