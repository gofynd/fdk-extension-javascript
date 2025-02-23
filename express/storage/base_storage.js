'use strict';
const logger = require('../logger');

class BaseStorage {
    constructor(prefixKey) {
        if(prefixKey) {
            this.prefixKey = prefixKey + ":";
        } else {
            this.prefixKey = "";
        }
    }

    async get(key) {
        throw Error("Method not implemented");
    }

    async set(key, value) {
        throw Error("Method not implemented");
    }

    async del(key) {
        throw Error("Method not implemented");
    }

    async setex(key, value, ttl) {
        throw Error("Method not implemented");
    }

    async hget(key, hashKey) {
        logger.warn("This method will be deprecated in future.");
        throw Error("Method not implemented");
    }

    async hset(key, hashKey, value) {
        logger.warn("This method will be deprecated in future.");
        throw Error("Method not implemented");
    }

    async hgetall(key) {
        logger.warn("This method will be deprecated in future.");
        throw Error("Method not implemented");
    }
}

module.exports = BaseStorage;
