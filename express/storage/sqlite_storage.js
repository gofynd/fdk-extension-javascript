const BaseStorage = require('./base_storage');

/**
 * SQLiteStorage class for handling storage operations with SQLite.
 * Note: This storage is not advisable for production environments.
 * @extends BaseStorage
 */
class SQLiteStorage extends BaseStorage {
  /**
     * Creates an instance of SQLiteStorage.
     * @param {Object} dbClient - The SQLite database client.
     * @param {string} prefixKey - The prefix key for storage keys.
     */
  constructor(dbClient, prefixKey) {
    super(prefixKey);
    this.dbClient = dbClient;
    this.initializeTable();
    this.setupTTLChecker();
    this.ttlCheckerInterval = null;
  }

  /**
     * Initializes the storage table if it does not exist.
     * @returns {Promise<void>}
     */
  async initializeTable() {
    const query = `
            CREATE TABLE IF NOT EXISTS storage (
                key TEXT PRIMARY KEY,
                value TEXT,
                ttl INTEGER
            )`;
    await this.dbClient.run(query);
  }

  /**
     * Sets up a TTL checker to remove expired keys.
     */
  setupTTLChecker() {
    if (!this.ttlCheckerInterval) {
      this.ttlCheckerInterval = setInterval(async () => {
        const now = Math.floor(Date.now() / 1000);
        const deleteQuery = 'DELETE FROM storage WHERE ttl < ? AND ttl IS NOT NULL';
        await this.dbClient.run(deleteQuery, [now]);
      }, 10000);
    }
  }

  /**
     * Retrieves a value by key from the storage.
     * @param {string} key - The key to retrieve.
     * @returns {Promise<Object|null>} - The value associated with the key, or null if not found.
     */
  async get(key) {
    const row = await new Promise((resolve, reject) => {
      this.dbClient.get('SELECT value FROM storage WHERE key = ?', [this.prefixKey + key], (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    return row ? JSON.parse(row.value) : null;
  }

  /**
     * Sets a value by key in the storage.
     * @param {string} key - The key to set.
     * @param {Object} value - The value to set.
     * @returns {Promise<void>}
     */
  async set(key, value) {
    return await this.dbClient.run(
      `INSERT INTO storage (key, value) VALUES (?, ?) 
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [this.prefixKey + key, JSON.stringify(value)],
    );
  }

  /**
     * Sets a value by key in the storage with an expiration time.
     * @param {string} key - The key to set.
     * @param {Object} value - The value to set.
     * @param {number} ttl - Time to live in seconds.
     * @returns {Promise<void>}
     */
  async setex(key, value, ttl) {
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    return await this.dbClient.run(
      `INSERT INTO storage (key, value, ttl) VALUES (?, ?, ?) 
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, ttl = excluded.ttl`,
      [this.prefixKey + key, JSON.stringify(value), expiresAt],
    );
  }

  /**
     * Deletes a value by key from the storage.
     * @param {string} key - The key to delete.
     * @returns {Promise<void>}
     */
  async del(key) {
    return await this.dbClient.run('DELETE FROM storage WHERE key = ?', [this.prefixKey + key]);
  }
}

module.exports = SQLiteStorage;
