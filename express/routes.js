'use strict';
const express = require('express');
const { SESSION_COOKIE_NAME } = require('../constants');
const SessionStorage = require("../session/session_storage");
const FdkRoutes = express.Router();
const handlers = require('../handlers');
const { formRequestObject } = require('../utils');

function setupRoutes(ext) {

    let storage = ext.storage;
    let callbacks = ext.callbacks;

    FdkRoutes.get("/fp/install", async (req, res, next) => {
        try {
            // ?company_id=1&client_id=123313112122
            let companyId = parseInt(req.query.company_id);
            const { redirectUrl, fdkSession } = await handlers.fpInstall(req.query.company_id, req.query.application_id, ext);
            
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            res.header['x-company-id'] = companyId;
            res.cookie(compCookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            res.redirect(redirectUrl);
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
            const { redirectUrl, fdkSession } = await handlers.fpAuth(reqObj, req.query.state, req.query.code, ext, req.fdkSession?.id);
            res.header['x-company-id'] = companyId;
            res.cookie(compCookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "None"
            });
            res.redirect(redirectUrl);
        }
        catch (error) {
            next(error)
        }
    });


    FdkRoutes.post("/fp/auto_install", async (req, res, next) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpAutoInstall(reqObj ,req.body.company_id, req.body.code, ext);
            res.json({ message: "success" });
        }
        catch (error) {
            next(error)
        }
    });

    FdkRoutes.post("/fp/uninstall", async (req, res, next) => {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpUninstall(reqObj, req.body.company_id, ext);
            res.json({ success: true });
        }
        catch (error) {
            next(error)
        }
    });

    return FdkRoutes;
}


module.exports = setupRoutes;