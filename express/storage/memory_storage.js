'use strict';

const BaseStorage = require("./base_storage");
const logger = require("../logger");

/**
 * MemoryStorage class for handling in-memory storage operations.
 * Note: This storage is not advisable for production environments.
 * @extends BaseStorage
 */
class MemoryStorage extends BaseStorage {
    /**
     * Creates an instance of MemoryStorage.
     * @param {string} prefixKey - The prefix key for storage keys.
     */
    constructor(prefixKey) {
        super(prefixKey);
        this.__data = {};
        this.__expiry = {};
    }

    /**
     * Retrieves a value by key from the storage.
     * @param {string} key - The key to retrieve.
     * @returns {Promise<*>} - The value associated with the key.
     */
    async get(key) {
        const fullKey = this.prefixKey + key;
        if (this.__expiry[fullKey] && this.__expiry[fullKey] < Date.now()) {
            delete this.__data[fullKey];
            delete this.__expiry[fullKey];
            return null;
        }
        return this.__data[fullKey];
    }

    /**
     * Sets a value by key in the storage.
     * @param {string} key - The key to set.
     * @param {*} value - The value to set.
     * @returns {Promise<void>}
     */
    async set(key, value) {
        const fullKey = this.prefixKey + key;
        this.__data[fullKey] = value;
        delete this.__expiry[fullKey];
    }

    /**
     * Sets a value by key in the storage with an expiration time.
     * @param {string} key - The key to set.
     * @param {*} value - The value to set.
     * @param {number} ttl - Time to live in seconds.
     * @returns {Promise<void>}
     */
    async setex(key, value, ttl) {
        const fullKey = this.prefixKey + key;
        this.__data[fullKey] = value;
        this.__expiry[fullKey] = Date.now() + ttl * 1000;
    }

    /**
     * Deletes a value by key from the storage.
     * @param {string} key - The key to delete.
     * @returns {Promise<void>}
     */
    async del(key) {
        const fullKey = this.prefixKey + key;
        delete this.__data[fullKey];
        delete this.__expiry[fullKey];
    }

    /**
     * Retrieves a value by key and hash key from the storage.
     * @deprecated This method will be deprecated in future.
     * @param {string} key - The key to retrieve.
     * @param {string} hashKey - The hash key to retrieve.
     * @returns {Promise<*>} - The value associated with the hash key.
     */
    async hget(key, hashKey) {
        logger.warn("This method will be deprecated in future.");
        let hashMap = this.__data[this.prefixKey + key];
        if(hashMap) {
            return hashMap[hashKey];
        }
        return null;
    }

    /**
     * Sets a value by key and hash key in the storage.
     * @deprecated This method will be deprecated in future.
     * @param {string} key - The key to set.
     * @param {string} hashKey - The hash key to set.
     * @param {*} value - The value to set.
     * @returns {Promise<void>}
     */
    async hset(key, hashKey, value) {
        logger.warn("This method will be deprecated in future.");
        let hashMap = this.__data[this.prefixKey + key] || {};
        hashMap[hashKey] = value;
        this.__data[this.prefixKey + key] = hashMap;
    }

    /**
     * Retrieves all values by key from the storage.
     * @deprecated This method will be deprecated in future.
     * @param {string} key - The key to retrieve.
     * @returns {Promise<Object>} - The hash map associated with the key.
     */
    async hgetall(key) {
        logger.warn("This method will be deprecated in future.");
        return this.__data[this.prefixKey + key];
    }
}

module.exports = MemoryStorage;