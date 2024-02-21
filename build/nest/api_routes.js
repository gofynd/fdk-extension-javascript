"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const { extension } = require('../extension');
const { getApplicationConfig, getUserData } = require('../utils');
let ApplicationProxyRoutes = class ApplicationProxyRoutes {
    async use(req, res, next) {
        try {
            const user = await getUserData(req.headers["x-user-data"]);
            const { application, applicationConfig, applicationClient } = await getApplicationConfig(req.headers["x-application-data"], extension);
            req.user = user;
            req.application = application;
            req.applicationConfig = applicationConfig;
            req.applicationClient = applicationClient;
            next();
        }
        catch (error) {
            next(error);
        }
    }
};
ApplicationProxyRoutes = __decorate([
    (0, common_1.Injectable)()
], ApplicationProxyRoutes);
module.exports = {
    applicationProxyRoutes: ApplicationProxyRoutes
};
//# sourceMappingURL=api_routes.js.map