#### How to create a custom storage class?
Custom storage classes allow you to implement extension storage in your preferred database. To achieve this, you are required to create a custom storage class by extending the base storage class provided by the fdk extension JavaScript library and implementing the mandatory methods according to your chosen database.

```javascript
const { BaseStorage } = require('@gofynd/fdk-extension-javascript/express/storage');

class MyCustomStorage extends BaseStorage {
    constructor(client, prefixKey) {
        super(prefixKey);
        this.client = client;
    }
    
    // All of the below methods must be implemented per your chosen database.
    
    async get(key) {
        // Implementation of a get method
    }
    
    async set(key, value) {
        // Implementation of a set method
    }

    async del(key) {
        // Implementation of a del method
    }

    async setex(key, value, ttl) {
        // Implementation of a setex method
    }
}
```

Example implementation of Redis Storage class

```javascript
'use strict';

const BaseStorage = require('fdk-extension-javascript');

class RedisStorage extends BaseStorage {
    constructor(client, prefixKey) {
        super(prefixKey);
        this.client = client;
    }

    async get(key) {
        return await this.client.get(this.prefixKey + key);
    }

    async set(key, value) {
        return await this.client.set(this.prefixKey + key, value);
    }

    async setex(key, value, ttl) {
        return await this.client.setex(this.prefixKey + key, ttl, value);
    }

    async del(key) {
        this.client.del(this.prefixKey + key);
    }
}

module.exports = RedisStorage;
```