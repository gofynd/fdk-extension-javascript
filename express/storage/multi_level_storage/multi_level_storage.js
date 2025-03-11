const BaseStorage = require('../base_storage');
const logger = require('../../logger');

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

/**
 * Multi-level storage using ioredis and Mongoose interfaces.
 * @extends BaseStorage
 */
class MultiLevelStorage extends BaseStorage {
    /**
     * Initializes Redis and Mongoose connections.
     * @param {string} prefixKey - Prefix for all keys stored.
     * @param {Object} redisInstance - ioredis instance.
     * @param {Object} mongooseInstance - Mongoose connection instance.
     * @param {Object} options - Additional configuration options (e.g., custom collection name, autoIndex).
     */
    constructor(prefixKey, redisInstance, mongooseInstance, options = {}) {
        super(prefixKey);

        if (!redisInstance || !mongooseInstance) {
            throw new StorageConnectionError('Both Redis and Mongoose instances are required.');
        }
        
        if (typeof redisInstance.get !== 'function') {
            throw new StorageConnectionError('Invalid ioredis instance provided.');
        }

        if (typeof mongooseInstance.model !== 'function') {
            throw new StorageConnectionError('Invalid Mongoose instance provided.');
        }

        this.redis = redisInstance;
        this.mongoose = mongooseInstance;
        const collectionName = options.collectionName || 'fdk_ext_acc_tokens';
        const autoIndex = options.autoIndex !== undefined ? options.autoIndex : true;

        const schema = new this.mongoose.Schema({
            key: { type: String, required: true, unique: true },
            value: { type: Object, required: true },
            updatedAt: { type: Date, default: Date.now },
            expireAt: { type: Date, default: null, index: { expires: 0 } } // Auto-expire index
        });

        if (autoIndex) {
            this.mongoose.connection.db.admin().command({ replSetGetStatus: 1 }, (err, info) => {
                if (err) {
                    logger.warn('Unable to determine MongoDB replica set status. Please ensure indexes are created manually.');
                } else {
                    const isPrimary = info.members.some(member => member.stateStr === 'PRIMARY' && member.self);
                    if (isPrimary) {
                        schema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
                    } else {
                        logger.warn(`Connected to secondary MongoDB instance. Please ensure indexes are created manually on the collection '${collectionName}' for the field 'expireAt'.`);
                    }
                }
            });
        }

        this.model = this.mongoose.model(collectionName, schema);
    }

    /**
     * Retrieves a value by key from Redis, falls back to Mongoose if not found.
     * @param {string} key - The key to retrieve.
     * @returns {Promise<Object|null>} The retrieved value or null if not found.
     */
    async get(key) {
        const fullKey = this.prefixKey + key;
        try {
            let value = await this.redis.get(fullKey);
            if (value) return JSON.parse(value);

            const doc = await this.model.findOne({ key: fullKey });
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
     * Sets a value for a given key in Redis and Mongoose.
     * @param {string} key - The key to set.
     * @param {Object} value - The value to store.
     */
    async set(key, value) {
        const fullKey = this.prefixKey + key;
        try {
            await this.redis.set(fullKey, JSON.stringify(value));
            await this.model.updateOne(
                { key: fullKey },
                { value, updatedAt: Date.now() },
                { upsert: true }
            );
        } catch (err) {
            throw new StorageOperationError(`Error setting key-value pair for '${key}': ${err.message}`);
        }
    }

    /**
     * Deletes a key from Redis and Mongoose.
     * @param {string} key - The key to delete.
     */
    async del(key) {
        const fullKey = this.prefixKey + key;
        try {
            await this.redis.del(fullKey);
            await this.model.deleteOne({ key: fullKey });
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
        const expirationDate = new Date(Date.now() + ttl * 1000);
        try {
            await this.redis.set(fullKey, JSON.stringify(value), 'EX', ttl);
            await this.model.updateOne(
                { key: fullKey },
                { value, updatedAt: Date.now(), expireAt: expirationDate },
                { upsert: true }
            );
        } catch (err) {
            throw new StorageOperationError(`Error setting key with TTL for '${key}': ${err.message}`);
        }
    }
}

module.exports = MultiLevelStorage;
