# fdk-extension-javascript

This library facilitates seamless configuration of authentication for accessing Fynd Platform APIs and webhook subscription.

#### Initial Setup

```javascript
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { setupFdk } = require("fdk-extension-javascript/express");
const { RedisStorage } = require("fdk-extension-javascript/express/storage"); // Import RedisStorage (default storage class). Use your custom class if you have implemented other databases.
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
app.use(fdkClient.fdkHandler);

app.listen(8080);
```
Refer to [paramerter](https://github.com/gofynd/fdk-extension-javascript/blob/fpco-26696/README.md#parameters-of-setupfdk-function) table of a setupFdk function.

#### How to call platform apis?

To call platform api you need to have instance of `PlatformClient`. This instance holds methods for SDK classes. All routes registered under `platformApiRoutes`, express router will have `platformClient` under request object which is instance of `PlatformClient`.

> Here `platformApiRoutes` has middleware attached which allows passing such request which are called after launching extension under any company.

```javascript
fdkClient.platformApiRoutes.get("/test/routes", async (req, res, next) => {
  try {
    let data = await req.platformClient.lead.getTickets();
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.use(fdkClient.platformApiRoutes);
```

#### How to call platform apis in background tasks?

Background tasks running under some consumer or webhook or under any queue can get platform client via method `getPlatformClient`. It will return instance of `PlatformClient` as well. 

> Here FdkClient `access_mode` should be **offline**. Cause such client can only access PlatformClient in background task.  

```javascript
function backgroundHandler(companyId) {
  try {
    const platformClient = await fdkExtension.getPlatformClient(companyId);
    let data = await platformClient.lead.getTickets();
    // Some business logic here
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ success: false });
  }
}
```

#### How to call application apis?

To interact with an application's API using Express, you must have an instance of `ApplicationClient`. This instance holds methods for SDK classes. All routes registered under `applicationProxyRoutes`, express router will have `applicationClient` under request object.

```javascript
fdkClient.applicationProxyRoutes.get("/app/routes", async (req, res, next) => {
  try {
    let data = await req.applicationClient.lead.getTickets();
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.use(fdkClient.applicationProxyRoutes);
```

#### How to call partner apis?

To call partner api you need to have instance of `PartnerClient`. Instance holds methods for SDK classes. All routes registered under `partnerApiRoutes` express router will have `partnerClient` under request object which is instance of `PartnerClient`.

> Here `partnerApiRoutes` has middleware attached which allows passing such request which are called after launching extension under any company.

```javascript
fdkClient.partnerApiRoutes.get("/test/routes", async (req, res, next) => {
  try {
    let data = await req.partnerClient.theme.getThemes();
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
  base_url: baseUrl, 
  scopes: ["company/products"],
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