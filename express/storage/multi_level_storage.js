/** @type {mongoose} */
let mongoose;
/** @type {Redis} */
let Redis;

const BaseStorage = require('./BaseStorage');

// Custom Error Classes
class StorageConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageConnectionError';
  }
}

class StorageOperationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageOperationError';
  }
}

// Define default MongoDB schema
const defaultSchema = {
  key: { type: String, required: true, unique: true },
  value: { type: Object, required: true },
  updatedAt: { type: Date, default: Date.now }
};

/**
 * Multi-level storage using Redis as the primary cache
 * and MongoDB as the fallback storage.
 * @extends BaseStorage
 */
class MultiLevelStorage extends BaseStorage {
  /**
   * Initializes Redis and MongoDB connections.
   * @param {string} prefixKey - Prefix for all keys stored.
   * @param {string|Object} redisConnection - Redis connection string or existing Redis instance.
   * @param {string|Object} mongoConnection - MongoDB connection URI or existing Mongoose connection.
   */
  constructor(prefixKey, redisConnection, mongoConnection) {
    super(prefixKey);

    (async () => {
      try {
        if (typeof redisConnection === 'string') {
          if (!Redis) Redis = (await import('ioredis')).default;
          this.redis = new Redis(redisConnection);
        } else {
          this.redis = redisConnection;
        }
      } catch (err) {
        throw new StorageConnectionError(`Redis connection failed: ${err.message}`);
      }

      try {
        if (mongoConnection.constructor.name === 'Connection') {
          this.mongoConnection = mongoConnection;
        } else {
          if (!mongoose) mongoose = (await import('mongoose')).default;
          this.mongoConnection = mongoose.createConnection(mongoConnection, {
            useNewUrlParser: true,
            useUnifiedTopology: true
          });
        }
        this.mongoModel = this.mongoConnection.model('MultiLevelStorage', defaultSchema);
      } catch (err) {
        throw new StorageConnectionError(`MongoDB connection failed: ${err.message}`);
      }
    })();
  }

  /**
   * Retrieves a value by key from Redis, falls back to MongoDB if not found.
   * @param {string} key - The key to retrieve.
   * @returns {Promise<Object|null>} The retrieved value or null if not found.
   */
  async get(key) {
    const fullKey = this.prefixKey + key;
    try {
      let value = await this.redis.get(fullKey);
      if (value) return JSON.parse(value);

      const doc = await this.mongoModel.findOne({ key: fullKey });
      if (doc) {
        await this.redis.set(fullKey, JSON.stringify(doc.value));
        return doc.value;
      }
      return null;
    } catch (err) {
      throw new StorageOperationError(`Error retrieving key '${key}': ${err.message}`);
    }
  }

  /**
   * Sets a value for a given key in Redis and MongoDB.
   * @param {string} key - The key to set.
   * @param {Object} value - The value to store.
   */
  async set(key, value) {
    const fullKey = this.prefixKey + key;
    try {
      await this.redis.set(fullKey, JSON.stringify(value));
      await this.mongoModel.updateOne(
        { key: fullKey },
        { value, updatedAt: Date.now() },
        { upsert: true }
      );
    } catch (err) {
      throw new StorageOperationError(`Error setting key-value pair for '${key}': ${err.message}`);
    }
  }

  /**
   * Deletes a key from Redis and MongoDB.
   * @param {string} key - The key to delete.
   */
  async del(key) {
    const fullKey = this.prefixKey + key;
    try {
      await this.redis.del(fullKey);
      await this.mongoModel.deleteOne({ key: fullKey });
    } catch (err) {
      throw new StorageOperationError(`Error deleting key '${key}': ${err.message}`);
    }
  }

  /**
   * Sets a key-value pair with an expiration time (TTL).
   * @param {string} key - The key to set.
   * @param {Object} value - The value to store.
   * @param {number} ttl - Time to live in seconds.
   */
  async setex(key, value, ttl) {
    const fullKey = this.prefixKey + key;
    try {
      await this.redis.setex(fullKey, ttl, JSON.stringify(value));
      await this.mongoModel.updateOne(
        { key: fullKey },
        { value, updatedAt: Date.now() },
        { upsert: true }
      );
    } catch (err) {
      throw new StorageOperationError(`Error setting key with TTL for '${key}': ${err.message}`);
    }
  }
}

module.exports = MultiLevelStorage;
