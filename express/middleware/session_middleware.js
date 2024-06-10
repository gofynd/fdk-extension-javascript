'use strict';
const SessionStorage = require("../session/session_storage");

function sessionMiddleware(strict) {
    return async (req, res, next) => {
        try {
            let token = req.query.token || req.headers.authorization;
            if(!token)
                return res.status(401).json({ "message": "Authorization token missing" });
            req.fdkSession = await SessionStorage.getSession(token);
    
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