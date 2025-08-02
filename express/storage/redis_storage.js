const BaseStorage = require('./base_storage');
// const _logger = require('../logger');

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
     * @returns {Promise<Object|null>} The parsed object value or null if not found.
     */
  async get(key) {
    const value = await this.client.get(this.prefixKey + key);
    return value ? JSON.parse(value) : null;
  }

  /**
     * Sets the value of a key in Redis.
     * @param {string} key - The key to set the value for.
     * @param {Object} value - The object value to set.
     * @returns {Promise<string>} The result of the set operation.
     */
  async set(key, value) {
    return await this.client.set(this.prefixKey + key, JSON.stringify(value));
  }

  /**
     * Sets the value of a key in Redis with an expiration time.
     * @param {string} key - The key to set the value for.
     * @param {Object} value - The object value to set.
     * @param {number} ttl - The time-to-live in seconds.
     * @returns {Promise<string>} The result of the setex operation.
     */
  async setex(key, value, ttl) {
    return await this.client.setex(this.prefixKey + key, ttl, JSON.stringify(value));
  }

  /**
     * Deletes a key from Redis.
     * @param {string} key - The key to delete.
     * @returns {Promise<void>}
     */
  async del(key) {
    await this.client.del(this.prefixKey + key);
  }
}

module.exports = RedisStorage;
