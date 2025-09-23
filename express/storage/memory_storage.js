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
     * @returns {Promise<Object|null>} - The parsed object associated with the key.
     */
    async get(key) {
        const fullKey = this.prefixKey + key;
        if (this.__expiry[fullKey] && this.__expiry[fullKey] < Date.now()) {
            delete this.__data[fullKey];
            delete this.__expiry[fullKey];
            return null;
        }
        const value = this.__data[fullKey];
        return value ? JSON.parse(value) : null;
    }

    /**
     * Sets a value by key in the storage.
     * @param {string} key - The key to set.
     * @param {Object} value - The object to store.
     * @returns {Promise<void>}
     */
    async set(key, value) {
        const fullKey = this.prefixKey + key;
        this.__data[fullKey] = JSON.stringify(value);
        delete this.__expiry[fullKey];
    }

    /**
     * Sets a value by key in the storage with an expiration time.
     * @param {string} key - The key to set.
     * @param {Object} value - The object to store.
     * @param {number} ttl - Time to live in seconds.
     * @returns {Promise<void>}
     */
    async setex(key, value, ttl) {
        const fullKey = this.prefixKey + key;
        this.__data[fullKey] = JSON.stringify(value);
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
}

module.exports = MemoryStorage;
