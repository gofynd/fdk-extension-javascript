'use strict';
const Session = require("./session");

class SessionStorage {
    constructor(storage) {
        this.storage = storage;
    }

    async saveSession(session) {
        if(session.expires) {
            let ttl = (new Date() - session.expires) / 1000;
            ttl = Math.abs(Math.round(Math.min(ttl, 0)));
            return this.storage.setex(session.id, JSON.stringify(session.toJSON()), ttl);
        } else {
            return this.storage.set(session.id, JSON.stringify(session.toJSON()));
        }
    }

    async getSession(sessionId) {
        let session = await this.storage.get(sessionId);
        if(session) {
            session = JSON.parse(session);
            session = Session.cloneSession(sessionId, session, false);
        }
        return session;
    }

    async deleteSession(sessionId) {
        return this.storage.del(sessionId);
    }
}

module.exports = SessionStorage;