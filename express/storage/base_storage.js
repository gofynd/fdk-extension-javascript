'use strict';
const logger = require('../logger');

/**
 * BaseStorage class to define a standard interface for different storage implementations.
 * All storage classes (e.g., RedisStorage, MemoryStorage, SQLiteStorage) should extend this class
 * and implement its methods.
 */
class BaseStorage {
    /**
     * Creates an instance of BaseStorage.
     * @param {string} prefixKey - A prefix for keys to avoid collisions.
     */
    constructor(prefixKey) {
        this.prefixKey = prefixKey ? prefixKey + ":" : "";
    }

    /**
     * Retrieves a value by key from the storage.
     * Must be implemented by subclasses.
     * @param {string} key - The key to retrieve.
     * @returns {Promise<Object|null>} - The parsed object value or null if not found.
     */
    async get(key) {
        throw Error("Method not implemented. Should return the stored value as an object or null if not found.");
    }

    /**
     * Stores a value by key in the storage.
     * Must be implemented by subclasses.
     * @param {string} key - The key to store.
     * @param {Object} value - The object value to store.
     * @returns {Promise<string>} - Resolves when the operation is complete.
     */
    async set(key, value) {
        throw Error("Method not implemented. Should store the value as an object and return a success message.");
    }

    /**
     * Deletes a key from the storage.
     * Must be implemented by subclasses.
     * @param {string} key - The key to delete.
     * @returns {Promise<void>} - Resolves when the key is deleted.
     */
    async del(key) {
        throw Error("Method not implemented. Should delete the key and resolve when complete.");
    }

    /**
     * Stores a value with an expiration time (TTL) in the storage.
     * Must be implemented by subclasses.
     * @param {string} key - The key to store.
     * @param {Object} value - The object value to store.
     * @param {number} ttl - Time to live in seconds.
     * @returns {Promise<string>} - Resolves when the operation is complete.
     */
    async setex(key, value, ttl) {
        throw Error("Method not implemented. Should store the value with a TTL and return a success message.");
    }
}

module.exports = BaseStorage;
