'use strict';

const BaseStorage = require("./base_storage");

class SQLiteStorage extends BaseStorage {
    constructor(dbClient, prefixKey) {
        super(prefixKey);
        this.dbClient = dbClient;
        this.initializeTable();
        this.setupTTLChecker()
    }

    async initializeTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS storage (
                key TEXT PRIMARY KEY,
                value TEXT
                ttl INTEGER
            )`;
        await this.dbClient.run(query);
    }

    setupTTLChecker() {
        setInterval(async () => {
            const now = Math.floor(Date.now() / 1000);
            const deleteQuery = `DELETE FROM storage WHERE ttl < ? AND ttl IS NOT NULL`;
            await this.dbClient.run(deleteQuery, [now]);
        }, 10000);
    }

    async get(key) {
        const row = await this.dbClient.get(`SELECT value FROM storage WHERE key = ?`, [this.prefixKey + key]);
        return row ? row.value : null;
    }

    async set(key, value) {
        return await this.dbClient.run(`INSERT INTO storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [this.prefixKey + key, value]);
    }

    async setex(key, value, ttl) {
        const expiresAt = Math.floor(Date.now() / 1000) + ttl;
        return await this.dbClient.run(`INSERT INTO storage (key, value, ttl) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, ttl = excluded.ttl`, [this.prefixKey + key, value, expiresAt]);
    }

    async del(key) {
        return await this.dbClient.run(`DELETE FROM storage WHERE key = ?`, [this.prefixKey + key]);
    }
}

module.exports = SQLiteStorage;