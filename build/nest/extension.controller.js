var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
const { SESSION_COOKIE_NAME } = require('../constants');
const SessionStorage = require("../session/session_storage");
const handlers = require('../handlers');
const { formRequestObject } = require('../utils');
const { Controller, Post, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');
const { extension } = require('../extension');
let AppController = class AppController {
    async install(req, res, next) {
        try {
            let companyId = parseInt(req.query.company_id);
            const { redirectUrl, fdkSession } = await handlers.fpInstall(req.query.company_id, req.query.application_id, extension);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
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
            next(error);
        }
    }
    async auth(req, res, next) {
        var _a;
        try {
            let companyId = parseInt(req.query.company_id);
            const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
            let sessionId = req.signedCookies[compCookieName];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            req.extension = extension;
            const reqObj = formRequestObject(req);
            const { redirectUrl, fdkSession } = await handlers.fpAuth(reqObj, req.query.state, req.query.code, extension, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
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
            next(error);
        }
    }
    async autoInstall(req, res, next) {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpAutoInstall(reqObj, req.body.company_id, req.body.code, extension);
            res.json({ message: "success" });
        }
        catch (error) {
            next(error);
        }
    }
    async unInstall(req, res, next) {
        try {
            const reqObj = formRequestObject(req);
            await handlers.fpUninstall(reqObj, req.body.company_id, extension);
            res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    }
};
__decorate([
    Get('install'),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "install", null);
__decorate([
    Get('auth'),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "auth", null);
__decorate([
    Post('auto_install'),
    HttpCode(200),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "autoInstall", null);
__decorate([
    Post('uninstall'),
    HttpCode(200),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "unInstall", null);
AppController = __decorate([
    Controller('fp')
], AppController);
module.exports = AppController;
//# sourceMappingURL=extension.controller.js.map