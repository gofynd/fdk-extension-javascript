# fdk-extension-javascript
![GitHub package.json version](https://img.shields.io/github/package-json/v/gofynd/fdk-extension-javascript?style=plastic)
[![Coverage Status](https://coveralls.io/repos/github/gofynd/fdk-extension-javascript/badge.svg)](https://coveralls.io/github/gofynd/fdk-extension-javascript)

- A helper library for extension development on the Fynd Platform.

## Overview

The `FDK Extension JavaScript Library` eases the process of implementing OAuth and managing webhook subscriptions for Fynd Platform APIs. With its framework-agnostic nature, it adapts to any JavaScript framework, offering flexible options for extension development.

## Usage

### Setting Up OAuth Routes

> The process of integrating OAuth functionality into an existing extension involves creating specific routes within the extension: 
  - `/fp/install`: This route initiates the OAuth flow and obtains the authorization code with user consent.
    - Use the `extInstall` handler for this route. It requires three parameters: company_id, application_id, and the extension object, which is obtained from the `setupfdk` method.
    - The `extInstall` handler returns the redirect URL for the extension consent page and user session data, which should be sent back from the `/fp/install` route as a redirection.

  - `/fp/auth`: This route is used to exchange the authorization code for an access token.
    - Use the `extAuth` handler for this route. It takes five arguments: reqObject, state, code, extension object, and sessionId. The reqObject must contain a valid sessionId.
    - The `extAuth` handler returns the redirect URL for the extension home page and user session data, which should be sent back from the `/fp/auth` route as a redirection.

### Handling Uninstall Events
To manage cleanup when an extension is uninstalled from a company, you need to implement the `/fp/uninstall` route:

- `/fp/uninstall`: This route is used to handles clean up process of an extension.
  - Use the `extUninstall` handler for this route. It takes reqObject, companyId, and extension object as arguments, which is obtained from the `setupfdk` method.
  - This handler processes the client_id, company_id, and cluster data received in the request payload when the extension is uninstalled, facilitating the necessary cleanup.

#### Example code

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { setupFdk } = require("fdk-extension-javascript");
const sqlite3 = require('sqlite3').verbose();
const { SQLiteStorage } = require("fdk-extension-javascript/express/storage"); //SQLiteStorage class is provided by default. If you have implemented custom storage class, use <YourCustomStorageClass> here.
const sqliteInstance = new sqlite3.Database('session_storage.db');

const app = express();
app.use(cookieParser("ext.session"));
app.use(bodyParser.json({ limit: "2mb" }));

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
  base_url: "<EXTENSION_BASE_URL>", // Base URL for extension.
  callbacks: extensionHandler, // An object containing callback functions like auth, uninstall and others, allowing you to execute custom tasks related to your extension's lifecycle.
  storage: new SQLiteStorage(sqliteInstance), // An instance of storage (e.g. SQLiteStorage) for to store and manage user session data.
  access_mode: "offline", // Access mode of an extension. It can be `online` or `offline`.
});

let router = express.Router();
const handlers = fdkClient.routerHandlers; // Functions that constains implementaion of OAuth

router.get("/fp/install", async (req, res, next) => {
    const { redirectUrl, fdkSession } = await handlers.extInstall(
        req.query.company_id,
        req.query.application_id, // optional
        fdkClient.extension
    );
    // Return redirect url obtained in extInstall call
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
    req.fdkSession = await sqliteStorageInstance.get(sessionId); // Attach session to request object
    req.extension = fdkClient.extension; // Attach extension to request object
    const { redirectUrl, fdkSession } = await handlers.extAuth(
        reqObj,
        req.query.state,
        req.query.code,
        fdkClient.extension,
        sessionId
    );
    // Return redirect url obtained in extInstall call
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

router.post("/fp/uninstall", async (req, res, next) => {
    await handlers.extUninstall(
        reqObj,
        req.body.company_id,
        fdkClient.extension
    );
    res.json({ success: true });
});

app.use(router);
app.listen(3000);
```

### Parameters Table
#### Parameter table for `setupFdk` function

| Parameter  | Description | 
| ------------- | ------------- |
| api_key  | API Key of an extension for authentication.  |
| api_secret  | API Secret of an extension for authentication.  |
| base_url  | Base URL for extension.  |
| scopes  | An array of scopes indicating the specific permissions needed for an extension. |
| callbacks  | An object containing callback functions like auth, uninstall and others, allowing you to execute custom tasks related to your extension's lifecycle. |
| storage  | An instance of storage (e.g. SQLiteStorage) for to store and manage user session data.  |
| access_mode  | Access mode of an extension. It can be `online` or `offline`.  |
| cluster?  | The API endpoint of the Fynd Platform cluster. |
| debug?  | Enable debug logs if it is `true`. Value can be `true` or `false`.  |
| [webhook_config](#parameter-table-for-webhook-configuration)  | Necessary configuration for webhooks.  |

#### Parameter table for `webhook` configuration
| Parameter  | Description |
| ------------- | ------------- |
| api_path  | API endpoint to process webhooks event.  |
| notification_email  | Email address for webhook related notifications.  |
| subscribe_on_install?  | Whether to auto subscribe to all webhooks on extension installation. It can be true or false. |
| subscribed_saleschannel?  | If `specific` then you have to manually subscribe to sales channel/website level events for individual sales channels. Value can be `all` or `optional`. |
| [event_map](#parameter-table-for-event_map-object)  | A mapping of events to corresponding handlers for webhook processing.  |

#### Parameter table for `event_map` object
| Parameter  | Description |
| ------------- | ------------- |
| key  | Name of a webhook event.  |
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
Please refer [webhook documentation](https://partners.fynd.com/help/docs/webhooks/latest/company#article) to know about event payload and it's structure.

```javascript

let fdkClient = setupFdk({
  api_key: "<API_KEY>",
  api_secret: "<API_SECRET>",
  base_url: baseUrl, // this is optional
  scopes: ["company/products"], // this is optional
  callbacks: {
    auth: async function (data) {
      console.log("called auth callback");
    },
    uninstall: async function (data) {
      console.log("called uninstall callback");
    },
  },
  storage: new SQLiteStorage(sqliteInstance),
  access_mode: "offline",
  webhook_config: {
    api_path: "/api/v1/webhooks", // API endpoint to process webhooks event.
    notification_email: "test@abc.com", // Email address for webhook related notifications.
    subscribe_on_install: false, // optional. Whether to auto subscribe to all webhooks on extension installation. It can be true or false.
    subscribed_saleschannel: 'specific', // optional. If `specific` then you have to manually subscribe to sales channel/website level events for individual sales channels. Value can be `all` or `optional`.
    event_map: { // required
      'company/brand/create': { // Event topic name follows {category}/{name}/{type} structure. Refer event payload to get 'category', 'name' and 'type' for required events
        version: '1', // API version of specified event
        handler: handleBrandCreate // A handler function when specified event occures,
        provider: 'rest' // if not provided, Default is `rest`
      },
      'company/location/update': {
        version: '1',
        handler: handleLocationUpdate,
      },
      'application/coupon/create': {
        version: '1',
        topic: 'coupon_create_kafka_topic',
        provider: 'kafka'
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



# [Custom storage class](/lib/storage/README.md)
The FDK Extension JavaScript library provides built-in support for SQLite, Redis and in-memory storage options as default choices for session data storage. However, if you require a different storage option, this readme will guide you through the process of implementing a custom storage class.

# Supported frameworks
This library comes with built-in compatibility for Express, NestJS, and Fastify frameworks.

Below, you'll find step-by-step instructions for implementing FDK extensions library in each of these frameworks.

# [Express Framework](/express/README.md)
Follow this readme if you intend to develop FDK extensions in the Express framework. The instructions outlined here will guide you through the entire implementation process.

# [Nest.js Framework](/nest/README.md)
Follow this readme if you intend to develop FDK extensions in the Express framework. The instructions outlined here will guide you through the entire implementation process.

# [Fastify Framework](/fastify/README.md)
Follow this readme if you intend to develop FDK extensions in the Express framework. The instructions outlined here will guide you through the entire implementation process.
