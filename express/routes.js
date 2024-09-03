'use strict';
const express = require('express');
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('../lib/constants');
const SessionStorage = require("../lib/session/session_storage");
const FdkRoutes = express.Router();
const handlers = require('../lib/handlers');
const { formRequestObject } = require('../lib/utils');

function setupRoutes(ext) {

    let storage = ext.storage;
    let callbacks = ext.callbacks;

    FdkRoutes.get("/fp/install", async (req, res, next) => {
        try {
            // ?company_id=1&client_id=123313112122
            let companyId = parseInt(req.query.company_id);
            let redirectPath = req.query.redirect_path;
            const { redirectUrl, fdkSession } = await handlers.extInstall(req.query.company_id, req.query.application_id, redirectPath, ext);
            
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            res.header['x-company-id'] = companyId;
            res.cookie(compCookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            return res.redirect(redirectUrl);
        } catch (error) {
            next(error);
        }
    });

    FdkRoutes.get("/fp/auth", async (req, res, next) => {
        // ?code=ddjfhdsjfsfh&client_id=jsfnsajfhkasf&company_id=1&state=jashoh
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = ext;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.extAuth(reqObj, req.query.state, req.query.code, ext, req.fdkSession?.id);
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
            next(error)
        }
    });

    FdkRoutes.post("/fp/uninstall", async (req, res, next) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.extUninstall(reqObj, req.body.company_id, ext);
            return res.json({ success: true });
        }
        catch (error) {
            next(error)
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
        } catch(error) {
            next(error);
        }
    });

    FdkRoutes.get("/adm/auth", async (req, res, next) => {
        try {
            let sessionId = req.signedCookies[ADMIN_SESSION_COOKIE_NAME];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            const { redirectUrl, fdkSession } = await handlers.admAuth(req.query.state, req.query.code, ext, req.fdkSession?.id);
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.cookie(cookieName, fdkSession.id, {
                secure: true,
                httpOnly: true, 
                expires: fdkSession.expires,
                signed: true,
                sameSite: 'none'
            })
            return res.redirect(redirectUrl);
        } catch(error) {
            next(error);
        }
    });

    return FdkRoutes;
}


module.exports = setupRoutes;