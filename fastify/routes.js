'use strict';
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('../lib/constants');
const SessionStorage = require("../lib/session/session_storage");
const handlers = require('../lib/handlers');
const { formRequestObject } = require('../lib/utils');
const { extension } = require('../lib/extension');
const { verifySignature } = require('../lib/utils');

async function setupRoutes(fastify, options){
    
    fastify.get("/fp/install", async (req, res) => {
        try {
            // ?company_id=1&client_id=123313112122
            let companyId = parseInt(req.query.company_id);
            let redirectPath = req.query.redirect_path;
            const { redirectUrl, fdkSession } = await handlers.extInstall(req.query.company_id, req.query.application_id, redirectPath, extension);
            
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            res.header['x-company-id'] = companyId;
            res.setCookie(compCookieName, fdkSession.id, {
                domain: req.hostname,
                path: '/',
                secure: true,
                expires: fdkSession.expires,
                httpOnly: true,
                signed: true,
                sameSite: "None"
            });
            return res.redirect(redirectUrl);
        } catch (error) {
            throw error;
        }
    });

    fastify.get("/fp/auth", async (req, res) => {
        // ?code=ddjfhdsjfsfh&client_id=jsfnsajfhkasf&company_id=1&state=jashoh
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.unsignCookie(req.cookies[compCookieName]).value;
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = extension;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.extAuth(reqObj, req.query.state, req.query.code, extension, req.fdkSession?.id);
            res.header['x-company-id'] = companyId;
            res.setCookie(compCookieName, fdkSession.id, {
                domain: req.hostname,
                path: '/',
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            res.redirect(redirectUrl);
        }
        catch (error) {
            throw error;
        }
    });

    fastify.post("/fp/uninstall", async (req, res) => {
        try {
            const strToVerify = `${extension.api_key}:${extension.api_secret}`
            const reqObj = formRequestObject(req);
            await verifySignature(strToVerify, reqObj.headers)
            await handlers.extUninstall(reqObj, req.body.company_id, extension);
            res.send({ success: true });
        }
        catch (error) {
            throw error;
        }
    });
    
    fastify.get("/adm/install", async (req, res, next) => {
        try {
            let organizationId = req.query.organization_id;
            const { redirectUrl, fdkSession } = await handlers.admInstall(organizationId, extension);
            req.extension = extension;
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            
            res.setCookie(cookieName, fdkSession.id, {
                domain: req.hostname,
                path: '/',
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            
            res.redirect(redirectUrl);
        } catch (error) {
            throw error;
        }
    });

    fastify.get("/adm/auth", async (req, res, next) => {
        try {
            let sessionId = req.unsignCookie(req.cookies[ADMIN_SESSION_COOKIE_NAME]).value;
            req.fdkSession = await SessionStorage.getSession(sessionId);
            const { redirectUrl, fdkSession } = await handlers.admAuth(req.query.state, req.query.code, extension, req.fdkSession?.id);
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.setCookie(cookieName, fdkSession.id, {
                domain: req.hostname,
                path: '/',
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            res.redirect(redirectUrl);
        } catch (error) {
            throw error;
        }
    });

    return fastify;
}


module.exports = setupRoutes