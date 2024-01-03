const { SESSION_COOKIE_NAME } = require('../constants');
const SessionStorage = require("../session/session_storage");
const handlers = require('../handlers');
const { formRequestObject } = require('../utils');
const { Controller, Post ,Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');
const { extension } = require('../extension');

@Controller('fp')
class ExtensionController {
    @Get('install')
    @Bind(Req(), Res(), Next())
    async install(req, res, next) {
        try {
            // ?company_id=1&client_id=123313112122
            let companyId = parseInt(req.query.company_id);
            const { redirectUrl, fdkSession } = await handlers.fpInstall(req.query.company_id, req.query.application_id, extension);
            
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
    
    @Get('auth')
    @Bind(Req(), Res(), Next())
    async auth(req, res, next) {
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = extension;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.fpAuth(reqObj, req.query.state, req.query.code, extension, req.fdkSession?.id);
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
    
    @Post('auto_install')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async autoInstall(req, res, next) {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpAutoInstall(reqObj ,req.body.company_id, req.body.code, extension);
            res.json({ message: "success" });
        }
        catch (error) {
            next(error)
        }
    }
    
    @Post('uninstall')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async unInstall(req, res, next) {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpUninstall(reqObj, req.body.company_id, extension);
            res.json({ success: true });
        }
        catch (error) {
            next(error)
        }
    }
}


module.exports = ExtensionController;
