var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require('../lib/constants');
const SessionStorage = require("../lib/session/session_storage");
const handlers = require('../lib/handlers');
const { formRequestObject } = require('../lib/utils');
const { Controller, Post, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');
const { extension } = require('../lib/extension');
const { verifySignature } = require('../lib/utils');
let ExtensionController = class ExtensionController {
    async install(req, res, next) {
        try {
            let companyId = parseInt(req.query.company_id);
            let redirectPath = req.query.redirect_path;
            const { redirectUrl, fdkSession } = await handlers.extInstall(req.query.company_id, req.query.application_id, redirectPath, extension);
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
            const { redirectUrl, fdkSession } = await handlers.extAuth(reqObj, req.query.state, req.query.code, extension, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
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
    async unInstall(req, res, next) {
        try {
            const strToVerify = `${extension.api_key}:${extension.api_secret}`;
            const reqObj = formRequestObject(req);
            await verifySignature(strToVerify, reqObj.headers);
            await handlers.extUninstall(reqObj, req.body.company_id, extension);
            res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    }
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
        }
        catch (error) {
            next(error);
        }
    }
    async admAuth(req, res, next) {
        var _a;
        try {
            let sessionId = req.signedCookies[ADMIN_SESSION_COOKIE_NAME];
            req.fdkSession = await SessionStorage.getSession(sessionId);
            const { redirectUrl, fdkSession } = await handlers.admAuth(req.query.state, req.query.code, extension, (_a = req.fdkSession) === null || _a === void 0 ? void 0 : _a.id);
            const cookieName = ADMIN_SESSION_COOKIE_NAME;
            res.cookie(cookieName, fdkSession.id, {
                secure: true,
                httpOnly: true,
                expires: fdkSession.expires,
                signed: true,
                sameSite: 'none'
            });
            res.redirect(redirectUrl);
        }
        catch (error) {
            next(error);
        }
    }
};
__decorate([
    Get('fp/install'),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExtensionController.prototype, "install", null);
__decorate([
    Get('fp/auth'),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExtensionController.prototype, "auth", null);
__decorate([
    Post('fp/uninstall'),
    HttpCode(200),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExtensionController.prototype, "unInstall", null);
__decorate([
    Get('adm/install'),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExtensionController.prototype, "admInstall", null);
__decorate([
    Get('adm/auth'),
    Bind(Req(), Res(), Next()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ExtensionController.prototype, "admAuth", null);
ExtensionController = __decorate([
    Controller()
], ExtensionController);
module.exports = ExtensionController;
