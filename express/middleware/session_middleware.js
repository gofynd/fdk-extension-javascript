'use strict';
const { ExtensionFactory } = require('../extension_factory');
const { SESSION_COOKIE_NAME } = require('./../constants');

function sessionMiddleware(extension, strict) {
    return async (req, res, next) => {
        try {
            const clusterId = req.query.cluster_origin;
            if (clusterId) {
                extension = ExtensionFactory.getExtension(clusterId)
            }
            const companyId = req.headers['x-company-id'] || req.query['company_id'];
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await extension.sessionStorage.getSession(sessionId);
    
            if(strict && !req.fdkSession) {
                return res.status(401).json({ "message": "unauthorized" });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    sessionMiddleware : sessionMiddleware
};