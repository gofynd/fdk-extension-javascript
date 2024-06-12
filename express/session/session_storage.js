'use strict';
const Session = require("./session");
const { extension } = require("./../extension");
const logger = require("../logger");
const tempTokenExpiresIn = 30 // 30 sec of expiry
class SessionStorage {
    constructor() {
    }

    static async saveSession(session, isTempToken) {
        const expires = isTempToken ? new Date(Date.now() + tempTokenExpiresIn * 1000) : session.expires;
        if(expires) {
            let ttl = (new Date() - expires) / 1000;
            ttl = Math.abs(Math.round(Math.min(ttl, 0)));
            return extension.storage.setex(session.id, JSON.stringify(session.toJSON()), ttl);
        } else {
            return extension.storage.set(session.id, JSON.stringify(session.toJSON()));
        }
    }

    static async getSession(sessionId) {
        let session = await extension.storage.get(sessionId);
        if(session) {
            session = JSON.parse(session);
            session = Session.cloneSession(sessionId, session, false);
        }
        else {
            logger.debug(`Session data not found for session id ${sessionId}`);
        }
        return session;
    }

    static async deleteSession(sessionId) {
        return extension.storage.del(sessionId);
    }
}

module.exports = SessionStorage;