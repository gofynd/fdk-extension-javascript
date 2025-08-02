const Session = require('./session');
const { extension } = require('../extension');
const logger = require('../logger');

class SessionStorage {
  /**
     * Saves a session to the storage.
     * @param {Object} session - The session object to save.
     * @returns {Promise<string>} The result of the set operation.
     */
  static async saveSession(session) {
    if (session.expires) {
      // Convert session.expires from milliseconds to seconds
      let ttl = (new Date() - session.expires) / 1000;
      ttl = Math.abs(Math.round(Math.min(ttl, 0)));
      return extension.storage.setex(session.id, session.toJSON(), ttl);
    }
    return extension.storage.set(session.id, session.toJSON());
  }

  /**
     * Retrieves a session from the storage.
     * @param {string} sessionId - The ID of the session to retrieve.
     * @returns {Promise<Object|null>} The session object or null if not found.
     */
  static async getSession(sessionId) {
    let session = await extension.storage.get(sessionId);
    if (session) {
      session = Session.cloneSession(sessionId, session, false);
    } else {
      logger.debug(`Session data not found for session id ${sessionId}`);
    }
    return session;
  }

  /**
     * Deletes a session from the storage.
     * @param {string} sessionId - The ID of the session to delete.
     * @returns {Promise<void>}
     */
  static async deleteSession(sessionId) {
    return extension.storage.del(sessionId);
  }
}

module.exports = SessionStorage;
