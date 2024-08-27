'use strict';
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('../constants');
const SessionStorage = require("../session/session_storage");
const handlers = require('../handlers');
const { formRequestObject } = require('../utils');
const { extension } = require('../extension');
async function setupRoutes(fastify, options) {
    fastify.get("/fp/install", async (req, res) => {
        try {
            let companyId = parseInt(req.query.company_id);
            let redirectPath = req.query.redirect_path;
            const { redirectUrl, fdkSession } = await handlers.fpInstall(req.query.company_id, req.query.application_id, redirectPath, extension);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
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
        }
        catch (error) {
            throw error;
        }
    });
    fastify.get("/fp/auth", async (req, res) => {
        var _a;
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
            let sessionId = req.unsignCookie(req.cookies[compCookieName]).value;
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = extension;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.fpAuth(reqObj, req.query.state, req.query.code, extension, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
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
    fastify.post("/fp/auto_install", async (req, res) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpAutoInstall(reqObj, req.body.company_id, req.body.code, extension);
            res.send({ message: "success" });
        }
        catch (error) {
            throw error;
        }
    });
    fastify.post("/fp/uninstall", async (req, res) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpUninstall(reqObj, req.body.company_id, extension);
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
        }
        catch (error) {
            throw error;
        }
    });
    fastify.get("/adm/auth", async (req, res, next) => {
        var _a;
        try {
            let sessionId = req.unsignCookie(req.cookies[ADMIN_SESSION_COOKIE_NAME]).value;
            req.fdkSession = await SessionStorage.getSession(sessionId);
            const { redirectUrl, fdkSession } = await handlers.admAuth(req.query.state, req.query.code, extension, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
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
        }
        catch (error) {
            throw error;
        }
    });
    return fastify;
}
module.exports = setupRoutes;
//# sourceMappingURL=routes.js.map