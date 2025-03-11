# MultiLevelStorage

MultiLevelStorage is a Node.js library that provides a multi-level caching mechanism using **ioredis** for fast in-memory storage and **Mongoose** for persistent storage in MongoDB. It ensures data consistency and faster retrievals by leveraging Redis as a cache layer and MongoDB as a fallback.

## Features

- Redis (ioredis) for fast in-memory caching.
- MongoDB (Mongoose) for persistent storage.
- Automatic TTL (time-to-live) support for expiring keys.
- Seamless data fallback from Redis to MongoDB.

## Prerequisites

- A running Redis instance.
- A connected Mongoose instance for MongoDB.

## Usage

### Import

```js
const Redis = require('ioredis');
const mongoose = require('mongoose');
const { MultiLevelStorage } = require('@gofynd/fdk-extension-javascript/express/storage');
```

## Notes
> - Ensure `mongoose` is initialized with `autoIndex: true` **or** manually create a TTL index on the `expireAt` field of the collection (default: `MultiLevelStorage` or your custom collection name).

### Initialize Connections

```js
// Initialize Redis connection
const redisClient = new Redis();

// Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/yourdb');

// Initialize MultiLevelStorage
const storage = new MultiLevelStorage('app_prefix_', redisClient, mongoose, { collectionName: 'collection_name', autoIndex: true });
```

### Options

- `collectionName` (default: `'fdk_ext_acc_tokens'`): The name of the MongoDB collection to use.
- `autoIndex` (default: `true`): Whether to automatically create indexes on the MongoDB collection.

### Basic Operations

#### Set a Value
```js
await storage.set('user:123', { name: 'John Doe', age: 30 });
```

#### Get a Value
```js
const user = await storage.get('user:123');
console.log(user); // { name: 'John Doe', age: 30 }
```

#### Set Value with Expiration
```js
await storage.setex('session:456', { token: 'abcd1234' }, 3600); // Expires in 1 hour
```

#### Delete a Key
```js
await storage.del('user:123');
```

## Index Creation

If `autoIndex` is set to `true` and the MongoDB instance is connected to a primary node, the TTL index will be created automatically on the `expireAt` field. If connected to a secondary node, you will need to create the index manually.

### Manual Index Creation

To manually create the TTL index on the `expireAt` field, run the following command in your MongoDB shell:

```shell
db.collection_name.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
```

Replace `collection_name` with the name of your collection.

## Error Handling

- `StorageConnectionError`: Thrown for invalid Redis or MongoDB connections.
- `StorageOperationError`: Thrown during CRUD operation failures.

## License

MIT License

