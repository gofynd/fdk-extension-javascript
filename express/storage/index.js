'use strict';

const BaseStorage = require('./base_storage');
const MemoryStorage = require('./memory_storage');
const RedisStorage = require('./redis_storage');
const SQLiteStorage = require('./sqlite_storage');
const MultiLevelStorage = require('./multi_level_storage');

module.exports = {
    BaseStorage,
    MemoryStorage,
    RedisStorage,
    SQLiteStorage,
    MultiLevelStorage,
};
