const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('../lib/constants');
const SessionStorage = require("../lib/session/session_storage");
const handlers = require('../lib/handlers');
const { formRequestObject } = require('../lib/utils');
const { Controller, Post ,Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');
const { extension } = require('../lib/extension');
const { verifySignature } = require('../lib/utils');

@Controller()
class ExtensionController {
    @Get('fp/install')
    @Bind(Req(), Res(), Next())
    async install(req, res, next) {
        try {
            // ?company_id=1&client_id=123313112122
            let companyId = parseInt(req.query.company_id);
            let redirectPath = req.query.redirect_path;
            const { redirectUrl, fdkSession } = await handlers.extInstall(req.query.company_id, req.query.application_id, redirectPath, extension);
            
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
    }
    
    @Get('fp/auth')
    @Bind(Req(), Res(), Next())
    async auth(req, res, next) {
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = extension;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.extAuth(reqObj, req.query.state, req.query.code, extension, req.fdkSession?.id);
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
    }
    
    @Post('fp/uninstall')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async unInstall(req, res, next) {
        try {
            const strToVerify = {
                client_id: extension.api_key.toString(),
                company_id: req.body.company_id,
                cluster: extension.cluster
            }
            const reqObj = formRequestObject(req);
            await verifySignature(strToVerify, reqObj.headers)
            await handlers.extUninstall(reqObj, req.body.company_id, extension);
            res.json({ success: true });
        }
        catch (error) {
            next(error)
        }
    }

    @Get('adm/install')
    @Bind(Req(), Res(), Next())
    async admInstall(req, res, next) {
        try {
            let organizationId = req.query.organization_id;
            const { redirectUrl, fdkSession } = await handlers.admInstall(organizationId, extension);
            req.extension = extension;
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.cookie(cookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: "none"
            });
            res.redirect(redirectUrl);
        } catch(error) {
            next(error);
        }
    }
    
    @Get('adm/auth')
    @Bind(Req(), Res(), Next())
    async admAuth(req, res, next) {
        try {
            let sessionId = req.signedCookies[ADMIN_SESSION_COOKIE_NAME];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            const { redirectUrl, fdkSession } = await handlers.admAuth(req.query.state, req.query.code, extension, req.fdkSession?.id);
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.cookie(cookieName, fdkSession.id, {
                secure: true,
                httpOnly: true, 
                expires: fdkSession.expires,
                signed: true,
                sameSite: 'none'
            })
            res.redirect(redirectUrl);
        } catch(error) {
            next(error);
        }
    }
}


module.exports = ExtensionController;
