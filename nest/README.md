# fdk-extension-javascript

This library facilitates seamless configuration of authentication for accessing Fynd Platform APIs and webhook subscription.

#### Initial Setup

```javascript
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');
const { setupFdk } = require("fdk-extension-javascript/nest");
const { RedisStorage } = require("fdk-extension-javascript/storage"); // Import RedisStorage (default storage class). Use your custom class if you have implemented other databases.
const Redis = require("ioredis");

const app = await NestFactory.create(AppModule);
app.use(cookieParser("ext.session"));

const redis = new Redis();

let extensionHandler = {
  auth: async function (data) {
    console.log("called auth callback");
  },

  uninstall: async function (data) {
    console.log("called uninstall callback");
  },
};

let fdkClient = setupFdk({
  api_key: "<API_KEY>", // API Key of an extension for authentication.
  api_secret: "<API_SECRET>", // API Secret of an extension for authentication.
  base_url: baseUrl, // optional. Base URL for extension.
  scopes: ["company/products"], // optional. An array of scopes indicating the specific permissions needed for an extension.
  callbacks: extensionHandler, // The callback function to handle extension-related tasks.
  storage: new RedisStorage(redis), // An instance of storage (e.g., RedisStorage) for data storage.
  access_mode: "offline", // Access mode of an extension. It can be `online` or `offline`.
  cluster: "https://api.fyndx0.de", // optional. The API url of the Fynd Platform cluster.
});

await app.listen(8080);
```

```javascript
// app.module.js
import { Module } from '@nestjs/common';
import ExtensionController = require('fdk-extension-javascript/build/nest/extension.controller'); // ExtensionController hold routes of OAuth

@Module({
  controllers: [ExtensionController],
})
export class AppModule {}
```

Refer to [paramerter](https://github.com/gofynd/fdk-extension-javascript/blob/fpco-26696/README.md#parameters-of-setupfdk-function) table of a setupFdk function.

#### How to call platform apis?

To call a platform API, you need an instance of `PlatformClient`. You can obtain a `platformClient` instance by using the `getPlatformClient` method of the `setupFDK` function. This instance encompasses methods for SDK classes enabling the invocation of platform APIs.
> To access the `PlatformClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient. 

> To enforce this requirement, we propose adding a Nest js middleware that allows platform requests only after the extension has been launched under any company.

```javascript
// apiRoute.module.js
import { Module } from '@nestjs/common';
import { AuthorizeMiddleware } from './authorize.middleware';
import { ApiRoutesController } from './apiRoute.controller.js';

@Module({
  controllers: [ApiRoutesController],
})
export class ApiRouteModule {
configure(consumer) {
    consumer
      .apply(AuthorizeMiddleware)
      .forRoutes('api');
  }
}
```

```javascript
// apiRoute.controller.js
const { Controller, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');

@Controller('api')
class ApiRoutesController {
    @Get('test/routes')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async apiRoutes(req, res, next) {
        try {
          let platformClient = await fdkClient.getPlatformClient(company_id, req.fdkSession);
          let data = await platformClient.lead.getTickets();
          return res.send(data);
        }
        catch (error) {
            next(error)
        }
    }
}
module.exports = ApiRoutesController;
```

```javascript
// authorize.middleware.js
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {
  async use(req: any, res: Response, next: NextFunction) {
    try {
      req.fdkSession =
        await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 
      if (!req.fdkSession) {
        return res.status(401).json({ message: 'unauthorized' });
      }
      next();
    } catch (err) {
      next(err);
    }
  }
}
```

#### How to call platform apis in background tasks?

Background tasks running under some consumer or webhook or under any queue can get platform client via method `getPlatformClient`.

> Here FdkClient `access_mode` should be **offline**. Cause such client can only access PlatformClient in background task. 

> To access the `PlatformClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient.

```javascript
function backgroundHandler(companyId) {
  try {
    let fdkSession = await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 
    let platformClient = await fdkClient.getPlatformClient(company_id, req.fdkSession);
    let data = await platformClient.lead.getTickets();
    // Some business logic here
    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(404).send({ success: false });
  }
}
```
#### How to call application apis?

To communicate with an application's API in Nest.js, it is essential to obtain an instance of `ApplicationClient`. This instance can be acquired through the `applicationProxyRoutes` middleware provided by the `fdkClient` within your module which will automatically attach the ApplicationClient instance to the `req` (request) object for convenient access during API calls.

```javascript
// appProxy.module.js
const { Module } = require('@nestjs/common');
const AppProxyController = require('./appProxy.controller'); // Your app controller containing apis
@Module({
  imports: [],
  controllers: [AppProxyController],
})
export class AppProxyModule {
  configure(consumer) {
    consumer
      .apply(fdkClient.applicationProxyRoutes)
      .forRoutes('app');
  }
}
```

```javascript
// appProxy.controller.js
const { Controller, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');

@Controller('app')
class AppProxyController {
    @Get('test/routes')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async appProxyRoutes(req, res, next) {
        try {
          let data = await req.applicationClient.lead.getTickets();
          return res.send(data);
        }
        catch (error) {
            next(error)
        }
    }
}
module.exports = AppProxyController;
```

#### How to call partner apis?

To call a partner API, you need an instance of `PartnerClient`. You can obtain a `PartnerClient` instance by using the `getPartnerClient` method of the `setupFDK` function. This instance encompasses methods for SDK classes enabling the invocation of partner APIs.
> To access the `PartnerClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient. 

> To enforce this requirement, we propose adding a Nest js middleware that allows partner requests only after the extension has been launched under any company.

```javascript
// apiRoute.module.js
import { Module } from '@nestjs/common';
import { AuthorizeMiddleware } from './authorize.middleware';
import { ApiRoutesController } from './apiRoute.controller.js';

@Module({
  controllers: [ApiRoutesController],
})
export class ApiRouteModule {
configure(consumer) {
    consumer
      .apply(AuthorizeMiddleware)
      .forRoutes('api');
  }
}
```

```javascript
// apiRoute.controller.js
const { Controller, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');

@Controller('api')
class ApiRoutesController {
    @Get('test/routes')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async apiRoutes(req, res, next) {
        try {
          let partnerClient = await fdkClient.getPartnerClient(organization_id, req.fdkSession);
          let data = await partnerClient.theme.getThemess();
          return res.send(data);
        }
        catch (error) {
            next(error)
        }
    }
}
module.exports = ApiRoutesController;
```

```javascript
// authorize.middleware.js
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthorizeMiddleware implements NestMiddleware {
  async use(req: any, res: Response, next: NextFunction) {
    try {
      req.fdkSession =
        await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 
      if (!req.fdkSession) {
        return res.status(401).json({ message: 'unauthorized' });
      }
      next();
    } catch (err) {
      next(err);
    }
  }
}
```

#### How to register for webhook events?

Webhook events can be helpful to handle tasks when certain events occur on platform. You can subscribe to such events by passing `webhook_config` in setupFdk function.
Please refer [webhook documentation](https://partners.fynd.com/help/docs/partners/webhooks/webhook-events/article#payload) to know about event payload and it's structure.
 
```javascript

let fdkClient = setupFdk({
  api_key: "<API_KEY>",
  api_secret: "<API_SECRET>",
  base_url: baseUrl, // this is optional
  scopes: ["company/products"], // this is optional
  callbacks: extensionHandler,
  storage: new RedisStorage(redis),
  access_mode: "offline",
  cluster: "https://api.fyndx0.de",
  webhook_config: {
    api_path: "/api/v1/webhooks", // API endpoint to process webhooks event.
    notification_email: "test@abc.com", // Email address for webhook related notifications.
    subscribe_on_install: false, // optional. Whether to auto subscribe to all webhooks on extension installation. It can be true or false.
    subscribed_saleschannel: 'specific', // optional. If `specific` then you have to manually subscribe to sales channel/website level events for individual sales channels. Value can be `all` or `optional`.
    event_map: { // required
      'company/brand/create': { // Event topic name follows {category}/{name}/{type} structure. Refer event payload to get 'category', 'name' and 'type' for required events
        version: '1', // API version of specified event
        handler: handleBrandCreate // A handler function when specified event occures
      },
      'company/location/update': {
        version: '1',
        handler: handleLocationUpdate
      },
      'application/coupon/create': {
        version: '1',
        handler: handleCouponCreate
      }
    }
  },
  debug: true // optional. Enable debug logs if it is `true`. Value can be `true` or `false`.
});

```
> By default all webhook events all subscribed for all companies whenever they are installed. To disable this behavior set `subscribe_on_install` to `false`. If `subscribe_on_install` is set to false, you need to manually enable webhook event subscription by calling `syncEvents` method of `webhookRegistry`

There should be view on given api path to receive webhook call. It should be `POST` api path. Api view should call `processWebhook` method of `webhookRegistry` object available under `fdkClient` here.

> Here `processWebhook` will do payload validation with signature and calls individual handlers for event passed with webhook config. 

```javascript
// Register webhooks after OAuth completes
const { Controller, Get, Bind, Res, Req, Next, HttpCode } = require('@nestjs/common');
@Controller('api/v1')
class WebhookController{
    @Get('webhooks')
    @HttpCode(200)
    @Bind(Req(), Res(), Next())
    async webhooks(req, res, next) {
        try {
            await fdkClient.webhookRegistry.processWebhook(req);
            return res.status(200).data({"success": true});
        }
        catch(err) {
            logger.error(err);
        }
    }
}
```

> Setting `subscribed_saleschannel` as "specific" means, you will have to manually subscribe saleschannel level event for individual saleschannel. Default value here is "all" and event will be subscribed for all sales channels. For enabling events manually use function `enableSalesChannelWebhook`. To disable receiving events for a saleschannel use function `disableSalesChannelWebhook`. 


##### How webhook registery subscribes to webhooks on Fynd Platform?
After webhook config is passed to setupFdk whenever extension is launched to any of companies where extension is installed or to be installed, webhook config data is used to create webhook subscriber on Fynd Platform for that company. 

> Any update to webhook config will not automatically update subscriber data on Fynd Platform for a company until extension is opened atleast once after the update. 

Other way to update webhook config manually for a company is to call `syncEvents` function of webhookRegistery.   