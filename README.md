# fdk-extension-javascript

The FDK Extension JavaScript library is designed to streamline the implementation of OAuth for accessing Fynd Platform APIs and managing webhook subscriptions. This library offers built-in support for Express, Nest.js, and Fastify frameworks. Additionally, it provides flexibility for developing extensions in your preferred framework beyond the default support.

This readme provides step-by-step guidance on implementing FDK extensions in different frameworks.

# [Express Framework](https://github.com/gofynd/fdk-extension-javascript/tree/main/express/README.md)
Follow this readme if you intend to develop FDK extensions in the Express framework. The instructions outlined here will guide you through the entire implementation process.

# [Nest.js Framework](https://github.com/gofynd/fdk-extension-javascript/tree/main/nest/README.md)
Follow this readme if you intend to develop FDK extensions in the Express framework. The instructions outlined here will guide you through the entire implementation process.

# [Fastify Framework](https://github.com/gofynd/fdk-extension-javascript/tree/main/fastify/README.md)
Follow this readme if you intend to develop FDK extensions in the Express framework. The instructions outlined here will guide you through the entire implementation process.

# Developing Extensions in other frameworks

If you wish to develop an extension in a framework other than Express, Nest.js, or Fastify, refer to the documentation below.

>The process of integrating OAuth functionality into an existing extension involves creating specific routes within the extension. These routes, namely `/fp/install`, `/fp/auth`, `/fp/autoinstall`, and `/fp/uninstall`, play a crucial role in OAuth implementation. It is essential to attach a `routerHandler` to each of these created routes, which can be obtained from the `setupfdk` function.

> The `fpInstall` function call requires three parameters: company_id, application_id, and exe data (extension exposed through the setupfdk method). This call will return the redirect URL of an extension consent page and session data that must be sent back.

> The `fpAuth` function call takes five arguments: reqobject, state, code, ext and sessionId. Request object must contain valid sessionId. This call will return the redirect URL of an installed extension and the session data that must be sent back.

> The `fpAutoInstall` function call will take reqObject, companyId, code, and extension data as arguments. This is beneficial for installing the extension whenever a company is created.

> The `fpUninstall` function call will take reqObject, companyId, and extension as arguments. This facilitates the uninstallation of a specific extension.

#### Initial Setup

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { setupFdk } = require("fdk-extension-javascript");
const { RedisStorage } = require("fdk-extension-javascript/storage"); //RedisStorage class is provided by default. If you have implemented custom storage class, use <YourCustomStorageClass> here.
const Redis = require("ioredis");

const app = express();
app.use(cookieParser("ext.session"));
app.use(bodyParser.json({ limit: "2mb" }));

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

let router = app.express.Router();
const handlers = fdkClient.routerHandlers; // Functions that constains implementaion of OAuth

router.get("/fp/install", async (req, res, next) => {
    const { redirectUrl, fdkSession } = await handlers.fpInstall(
        req.query.company_id,
        req.query.application_id, // optional
        fdkClient.extension
    );
    // Return redirect url obtained in fpInstall call
    // Return fdk session (for example in cookies or jwt token or any other form )
    /*res.cookie(compCookieName, fdkSession.id, {
        secure: true,
        httpOnly: true,
        expires: fdkSession.expires,
        signed: true,
        sameSite: "None",
     });
    res.redirect(redirectUrl); */
});


router.get("/fp/auth", async (req, res, next) => {
    let sessionId = session_id; // Get the session id from cookies or jwt token or any other form
    req.fdkSession = await redis.get(sessionId); // Attach session to request object
    req.extension = fdkClient.extension; // Attach extension to request object
    const { redirectUrl, fdkSession } = await handlers.fpAuth(
        reqObj,
        req.query.state,
        req.query.code,
        fdkClient.extension,
        sessionId
    );
    // Return redirect url obtained in fpInstall call
    // Return fdk session (for example in cookies or jwt token or any other form )
    /*res.cookie(compCookieName, fdkSession.id, {
        secure: true,
        httpOnly: true,
        expires: fdkSession.expires,
        signed: true,
        sameSite: "None",
    });
    res.redirect(redirectUrl); */
});

router.post("/fp/auto_install", async (req, res, next) => {
    await handlers.fpAutoInstall(
        reqObj,
        req.body.company_id,
        req.body.code,
        fdkClient.extension
    );
    res.json({ message: "success" });
});

router.post("/fp/uninstall", async (req, res, next) => {
    await handlers.fpUninstall(
        reqObj,
        req.body.company_id,
        fdkClient.extension
    );
    res.json({ success: true });
});

app.use(router);
app.listen(3000);
```
### Parameters of setupFDK function
Parameter table for `setupFdk` function

| Parameter  | Description | 
| ------------- | ------------- |
| api_key  | API Key of an extension for authentication.  |
| api_secret  | API Secret of an extension for authentication.  |
| base_url?  | Base URL for extension.  |
| scopes?  | An array of scopes indicating the specific permissions needed for an extension. |
| callbacks  | The callback function to handle extension-related tasks. |
| storage  | An instance of storage (e.g., RedisStorage) for data storage.  |
| access_mode  | Access mode of an extension. It can be `online` or `offline`.  |
| cluster  | The API url of the Fynd Platform cluster. |
| webhook_config  | Necessary configuration for webhooks.  |

Parameter table for `webhook` configuration
| Parameter  | Description |
| ------------- | ------------- |
| api_path  | API endpoint to process webhooks event.  |
| notification_email  | Email address for webhook related notifications.  |
| subscribe_on_install?  | Whether to auto subscribe to all webhooks on extension installation. It can be true or false. |
| subscribed_saleschannel?  | If `specific` then you have to manually subscribe to sales channel/website level events for individual sales channels. Value can be `all` or `optional`. |
| debug?  | Enable debug logs if it is `true`. Value can be `true` or `false`.  |
| event_map  | A mapping of events to corresponding handlers for webhook processing.  |

Parameter table for `event_map` object
| Parameter  | Description |
| ------------- | ------------- |
| key  | API endpoint to process webhooks event.  |
| value  | `version` and `handler`  |
|   | `version`  -- API version of specified event |
|   | `handler` -- A handler function when specified event occures|

#### How to call platform apis?

To call a platform API, you need an instance of `PlatformClient`. You can obtain a `platformClient` instance by using the `getPlatformClient` method of the `setupFDK` function. This instance encompasses methods for SDK classes enabling the invocation of platform APIs.
> To access the `PlatformClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient. 

> To enforce this requirement, we propose adding a middleware that allows platform requests only after the extension has been launched under any company.

```javascript
fdkClient.platformApiRoutes.get("/test/routes", async (req, res, next) => {
    req.fdkSession = await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 
    if (!req.fdkSession) { // Authorize for valid request
    return res.status(401).json({ message: "User is unauthorized" });
    }
    
    let platformClient = await fdkClient.getPlatformClient(company_id, req.fdkSession)
    let data = await platformClient.lead.getTickets();
    res.json(data);
});

app.use(fdkClient.platformApiRoutes);
```

#### How to call platform apis in background tasks?

Background tasks running under some consumer or webhook or under any queue can get platform client via method `getPlatformClient`.

> Here FdkClient `access_mode` should be **offline**. Cause such client can only access PlatformClient in background task. 

> To access the `PlatformClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient. 

```javascript
function backgroundHandler(companyId) {
  let fdkSession = await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 

  let platformClient = await fdkClient.getPlatformClient(company_id, req.fdkSession);
  let data = await platformClient.lead.getTickets();
  // Some business logic here
  res.send({ success: true });
}
```

#### How to call application apis?

To call an application API, you need an instance of `ApplicationClient`. Instance holds methods for SDK classes. You can fetch the instance of `ApplicationClient` via `getApplicationClient` method exposed via `fdkClient` instance.

```javascript
fdkClient.applicationRouter.get("/test/routes", async (req, res, next) => {
    const user = await fdkClient.getUserData(req.headers["x-user-data"]); 
    const { application, applicationConfig, applicationClient } =
    await fdkClient.getApplicationConfig(
        req.headers["x-application-data"],
        fdkClient.extension
    );
    let data = await applicationClient.lead.getTickets();
    res.send({ success: true });
});
app.use(fdkClient.applicationRouter);
```

#### How to call partner apis?

To call a partner API, you need an instance of `PartnerClient`. You can obtain a `PartnerClient` instance by using the `getPartnerClient` method of the `setupFDK` function. This instance encompasses methods for SDK classes enabling the invocation of partner APIs.
> To access the `PartnerClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient. 

> To enforce this requirement, we propose adding a middleware that allows partner requests only after the extension has been launched under any company.

```javascript
fdkClient.partnerApiRoutes.get("/test/routes", async (req, res, next) => {
  try {
    req.fdkSession = await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 
    if (!req.fdkSession) { // Authorize for valid request
      return res.status(401).json({ message: "User is unauthorized" });
    }
    let partnerClient = await fdkClient.getPartnerClient(organizarion_id, req.fdkSession)
    let data = await partnerClient.theme.getThemes();    
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.use(fdkClient.partnerApiRoutes);
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
  debug: true // optional. Enables debug logs if `true`. Default `false`
});

```
> By default all webhook events all subscribed for all companies whenever they are installed. To disable this behavior set `subscribe_on_install` to `false`. If `subscribe_on_install` is set to false, you need to manually enable webhook event subscription by calling `syncEvents` method of `webhookRegistry`

There should be view on given api path to receive webhook call. It should be `POST` api path. Api view should call `processWebhook` method of `webhookRegistry` object available under `fdkClient` here.

> Here `processWebhook` will do payload validation with signature and calls individual handlers for event passed with webhook config. 

```javascript

app.post('/api/v1/webhooks', async (req, res, next) => {
  try {
    await fdkClient.webhookRegistry.processWebhook(req);
    return res.status(200).json({"success": true});
  }
  catch(err) {
    logger.error(err);
    return res.status(500).json({"success": false});
  }
});

```

> Setting `subscribed_saleschannel` as "specific" means, you will have to manually subscribe saleschannel level event for individual saleschannel. Default value here is "all" and event will be subscribed for all sales channels. For enabling events manually use function `enableSalesChannelWebhook`. To disable receiving events for a saleschannel use function `disableSalesChannelWebhook`. 


##### How webhook registery subscribes to webhooks on Fynd Platform?
After webhook config is passed to setupFdk whenever extension is launched to any of companies where extension is installed or to be installed, webhook config data is used to create webhook subscriber on Fynd Platform for that company. 

> Any update to webhook config will not automatically update subscriber data on Fynd Platform for a company until extension is opened atleast once after the update. 

Other way to update webhook config manually for a company is to call `syncEvents` function of webhookRegistery.   



# [Custom storage class](https://github.com/gofynd/fdk-extension-javascript/tree/main/storage/README.md)
The FDK Extension JavaScript library provides built-in support for Redis and in-memory storage options as default choices for session data storage. However, if you require a different storage option, this readme will guide you through the process of implementing a custom storage class.