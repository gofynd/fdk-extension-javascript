// @ts-check

'use strict';
const BaseStorage = require('./base_storage');
const Redis = require('ioredis').default;
const mongoose = require('mongoose');

/**
 * @typedef {Object} RedisOptions
 * @property {string} host - Redis server hostname.
 * @property {number} port - Redis server port number.
 * @property {number} [db=0] - Redis database number (default is 0).
 * @property {string} [password] - Password for Redis authentication (if required).
 * @property {number} [ttl] - Default time-to-live (in seconds) for keys.
 */

/**
 * Multi-level storage using Redis as the primary cache
 * and MongoDB as the fallback storage.
 * @extends BaseStorage
 */
class MultiLevelStorage extends BaseStorage {
    /**
     * @param {string} prefixKey - Prefix for all keys stored.
     * @param {RedisOptions} redisOptions - Redis client configuration options.
     * @param {mongoose.Model} mongoModel - Mongoose model for MongoDB storage.
     */
    constructor(prefixKey, redisOptions, mongoModel) {
        super(prefixKey);
        this.redis = new Redis(redisOptions);
        this.mongoModel = mongoModel;
    }

    /**
     * Retrieve the value associated with a key from Redis or MongoDB.
     * @param {string} key - The key to retrieve.
     * @returns {Promise<*>} - The value stored or null if not found.
     */
    async get(key) {
        const fullKey = this.prefixKey + key;
        let value = await this.redis.get(fullKey);
        if (value) return JSON.parse(value);

        // Fallback to MongoDB
        const doc = await this.mongoModel.findOne({ key: fullKey });
        if (doc) {
            await this.redis.set(fullKey, JSON.stringify(doc.value)); // Cache it back in Redis
            return doc.value;
        }
        return null;
    }

    /**
     * Store a value in Redis and MongoDB.
     * @param {string} key - The key to store.
     * @param {*} value - The value to store.
     * @returns {Promise<void>}
     */
    async set(key, value) {
        const fullKey = this.prefixKey + key;
        await this.redis.set(fullKey, JSON.stringify(value));
        await this.mongoModel.updateOne(
            { key: fullKey },
            { value },
            { upsert: true }
        );
    }

    /**
     * Delete a key-value pair from both Redis and MongoDB.
     * @param {string} key - The key to delete.
     * @returns {Promise<void>}
     */
    async del(key) {
        const fullKey = this.prefixKey + key;
        await this.redis.del(fullKey);
        await this.mongoModel.deleteOne({ key: fullKey });
    }

    /**
     * Store a value with a time-to-live (TTL) in Redis and persist in MongoDB.
     * @param {string} key - The key to store.
     * @param {*} value - The value to store.
     * @param {number} ttl - Time-to-live in seconds.
     * @returns {Promise<void>}
     */
    async setex(key, value, ttl) {
        const fullKey = this.prefixKey + key;
        await this.redis.setex(fullKey, ttl, JSON.stringify(value));
        await this.mongoModel.updateOne(
            { key: fullKey },
            { value },
            { upsert: true }
        );
    }
}

module.exports = MultiLevelStorage;
