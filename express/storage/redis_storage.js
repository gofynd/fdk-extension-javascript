'use strict';

const BaseStorage = require("./base_storage");
const logger = require("../logger");

/**
 * RedisStorage class for handling Redis operations.
 * @extends BaseStorage
 */
class RedisStorage extends BaseStorage {
    /**
     * Creates an instance of RedisStorage.
     * @param {Object} client - The Redis client.
     * @param {string} prefixKey - The prefix key for Redis keys.
     */
    constructor(client, prefixKey) {
        super(prefixKey);
        this.client = client;
    }

    /**
     * Gets the value of a key from Redis.
     * @param {string} key - The key to get the value for.
     * @returns {Promise<string>} The value of the key.
     */
    async get(key) {
        return await this.client.get(this.prefixKey + key);
    }

    /**
     * Sets the value of a key in Redis.
     * @param {string} key - The key to set the value for.
     * @param {string} value - The value to set.
     * @returns {Promise<string>} The result of the set operation.
     */
    async set(key, value) {
        return await this.client.set(this.prefixKey + key, value);
    }

    /**
     * Sets the value of a key in Redis with an expiration time.
     * @param {string} key - The key to set the value for.
     * @param {string} value - The value to set.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<string>} The result of the setex operation.
     */
    async setex(key, value, ttl) {
        return await this.client.setex(this.prefixKey + key, ttl, value);
    }

    /**
     * Deletes a key from Redis.
     * @param {string} key - The key to delete.
     * @returns {Promise<void>}
     */
    async del(key) {
        this.client.del(this.prefixKey + key);
    }

    /**
     * Gets the value of a hash field from Redis.
     * @param {string} key - The key of the hash.
     * @param {string} hashKey - The field of the hash to get the value for.
     * @returns {Promise<string>} The value of the hash field.
     * @deprecated This method will be deprecated in future.
     */
    async hget(key, hashKey) {
        logger.warn("This method will be deprecated in future.");
        return await this.client.hget(this.prefixKey + key, hashKey);
    }

    /**
     * Sets the value of a hash field in Redis.
     * @param {string} key - The key of the hash.
     * @param {string} hashKey - The field of the hash to set the value for.
     * @param {string} value - The value to set.
     * @returns {Promise<number>} The result of the hset operation.
     * @deprecated This method will be deprecated in future.
     */
    async hset(key, hashKey, value) {
        logger.warn("This method will be deprecated in future.");
        return await this.client.hset(this.prefixKey + key, hashKey, value);
    }

    /**
     * Gets all the fields and values of a hash from Redis.
     * @param {string} key - The key of the hash.
     * @returns {Promise<Object>} The fields and values of the hash.
     * @deprecated This method will be deprecated in future.
     */
    async hgetall(key) {
        logger.warn("This method will be deprecated in future.");
        return await this.client.hgetall(this.prefixKey + key);
    }
}

module.exports = RedisStorage;