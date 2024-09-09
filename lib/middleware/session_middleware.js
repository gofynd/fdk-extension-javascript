'use strict';
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('./../../lib/constants');
const { getSessionData } = require('../../lib/utils');
function sessionMiddleware(strict) {
    return async (req, res, next) => {
        try {
            const companyId = req.headers['x-company-id'] || req.query['company_id'];
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession  = await getSessionData(sessionId, strict);       
            if(!req.fdkSession) {
                return res.status(401).json({ "message": "unauthorized" });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

function partnerSessionMiddleware() {
    return async (req, res, next) => {
        try {
            let sessionId = req.signedCookies[ADMIN_SESSION_COOKIE_NAME];
            req.fdkSession = await getSessionData(sessionId);  
            if (!req.fdkSession) {
                return res.status(401).json({"message": "Unauthorized"});
            }
            next();
        } catch(error) {
            next(error);
        }
    }
}

module.exports = {
    sessionMiddleware: sessionMiddleware,
    partnerSessionMiddleware: partnerSessionMiddleware
};