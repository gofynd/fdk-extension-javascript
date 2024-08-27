'use strict';
const express = require('express');
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('../constants');
const SessionStorage = require("../session/session_storage");
const FdkRoutes = express.Router();
const handlers = require('../handlers');
const { formRequestObject } = require('../utils');
function setupRoutes(ext) {
    let storage = ext.storage;
    let callbacks = ext.callbacks;
    FdkRoutes.get("/fp/install", async (req, res, next) => {
        try {
            let companyId = parseInt(req.query.company_id);
            let redirectPath = req.query.redirect_path;
            const { redirectUrl, fdkSession } = await handlers.fpInstall(req.query.company_id, req.query.application_id, redirectPath, ext);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
            res.header['x-company-id'] = companyId;
            res.cookie(compCookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            return res.redirect(redirectUrl);
        }
        catch (error) {
            next(error);
        }
    });
    FdkRoutes.get("/fp/auth", async (req, res, next) => {
        var _a;
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = ext;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.fpAuth(reqObj, req.query.state, req.query.code, ext, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
            res.header['x-company-id'] = companyId;
            res.cookie(compCookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            return res.redirect(redirectUrl);
        }
        catch (error) {
            next(error);
        }
    });
    FdkRoutes.post("/fp/auto_install", async (req, res, next) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpAutoInstall(reqObj, req.body.company_id, req.body.code, ext);
            return res.json({ message: "success" });
        }
        catch (error) {
            next(error);
        }
    });
    FdkRoutes.post("/fp/uninstall", async (req, res, next) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpUninstall(reqObj, req.body.company_id, ext);
            return res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    });
    FdkRoutes.get("/adm/install", async (req, res, next) => {
        try {
            let organizationId = req.query.organization_id;
            const { redirectUrl, fdkSession } = await handlers.admInstall(organizationId, ext);
            req.extension = ext;
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.cookie(cookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "none"
            });
            return res.redirect(redirectUrl);
        }
        catch (error) {
            next(error);
        }
    });
    FdkRoutes.get("/adm/auth", async (req, res, next) => {
        var _a;
        try {
            let sessionId = req.signedCookies[ADMIN_SESSION_COOKIE_NAME];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            const { redirectUrl, fdkSession } = await handlers.admAuth(req.query.state, req.query.code, ext, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.cookie(cookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: 'none'
            });
            return res.redirect(redirectUrl);
        }
        catch (error) {
            next(error);
        }
    });
    return FdkRoutes;
}
module.exports = setupRoutes;
//# sourceMappingURL=routes.js.map