'use strict';
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('./../constants');
const SessionStorage = require("../session/session_storage");
const { sign } = require("@gofynd/fp-signature");

function sessionMiddleware(strict) {
    return async (req, res, next) => {
        try {
            const companyId = req.headers['x-company-id'] || req.query['company_id'];
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await SessionStorage.getSession(sessionId);
    
            if(strict && !req.fdkSession) {
                return res.status(401).json({ "message": "unauthorized" });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

function partnerSessionMiddleware(isStrict) {
    return async (req, res, next) => {
        try {
            let sessionId = req.signedCookies[ADMIN_SESSION_COOKIE_NAME];
            req.fdkSession = await SessionStorage.getSession(sessionId);

            if (isStrict && !req.fdkSession) {
                return res.status(401).json({"message": "Unauthorized"});
            }
            next();

        } catch(error) {
            next(error);
        }
    }
}

/**
 * Custom body encoding function for signature generation
 * Handles different content types appropriately without depending on axios internals
 * @param {Object} body - The request body object
 * @param {Object} headers - Headers for context
 * @returns {string} - Encoded body string for signature calculation
 */
function encodeBodyForSignature(body, headers) {
    // If body is already a string, return as is
    if (typeof body === 'string') {
        return body;
    }
    
    // If body is null or undefined, return empty string
    if (body === null || body === undefined) {
        return '';
    }
    
    // For JSON content type or when content-type is not specified, stringify the object
    const contentType = headers['content-type'] || '';
    if (contentType.includes('application/json') || !contentType) {
        return JSON.stringify(body);
    }
    
    // For form data (application/x-www-form-urlencoded), encode as URL search params
    if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams();
        Object.keys(body).forEach(key => {
            if (body[key] !== null && body[key] !== undefined) {
                params.append(key, body[key]);
            }
        });
        return params.toString();
    }
    
    // For multipart/form-data, we can't easily reconstruct the boundary
    // so we'll stringify the object as a fallback
    if (contentType.includes('multipart/form-data')) {
        return JSON.stringify(body);
    }
    
    // Default fallback: stringify the object
    return JSON.stringify(body);
}

function verifySignature(req, secret) {
    const reqSignature = req.headers['x-fp-signature'];
    const { body, headers, method, host, originalUrl, query } = req;

    // Check if x-fp-date is present and validate timestamp
    const fpDate = headers['x-fp-date'];
    if (!fpDate) {
        return { isValid: false, error: 'x-fp-date header is required' };
    }

    // Validate timestamp - reject if older than 5 minutes
    try {
        // Parse the fp-signature timestamp format (YYYYMMDDTHHMMSSZ)
        // Convert to ISO format for proper parsing
        const isoFormat = fpDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z');
        const requestTime = new Date(isoFormat);
        
        // Check if the date is valid
        if (isNaN(requestTime.getTime())) {
            return { isValid: false, error: 'Invalid timestamp format in x-fp-date header' };
        }
        
        const currentTime = new Date();
        const timeDifference = Math.abs(currentTime - requestTime);
        const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (timeDifference > fiveMinutesInMs) {
            return { isValid: false, error: 'Request timestamp is too old (older than 5 minutes)' };
        }
    } catch (error) {
        return { isValid: false, error: 'Invalid timestamp format in x-fp-date header' };
    }

    // Create headers for signing, only including allowed headers: x-user-data, x-fp-date, host, x-application-data
    const allowedHeaders = ['x-user-data', 'x-fp-date', 'host', 'x-application-data', 'x-fp-sdk-version'];
    const headersForSigning = {};
    
    // Only include allowed headers in signature calculation (case-insensitive)
    allowedHeaders.forEach(headerName => {
        // Find the header with case-insensitive matching
        const actualHeaderName = Object.keys(headers).find(key => 
            key.toLowerCase() === headerName.toLowerCase()
        );
        if (actualHeaderName) {
            headersForSigning[headerName] = headers[actualHeaderName];
        }
    });

    const signatureData = {
        host,
        method,
        headers: headersForSigning,
        path: originalUrl
    }
    if(Object.keys(body).length){
        // Custom body encoding for signature generation
        const transformedBody = encodeBodyForSignature(body, headersForSigning);
        signatureData.body = transformedBody;
    }

    const calcSignature = sign(signatureData, {secret});
    if (reqSignature !== calcSignature) {
        return { isValid: false, error: 'Invalid signature', isSignError: true };
    }
    return { isValid: true };
}
module.exports = {
    sessionMiddleware : sessionMiddleware,
    partnerSessionMiddleware: partnerSessionMiddleware,
    verifySignature
};