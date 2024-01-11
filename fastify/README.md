# fdk-extension-javascript

FDK Extension Helper Library

#### Initial Setup

```javascript
const fastify = require("fastify");
const { setupFdk } = require("fdk-extension-javascript/fastify");
const { RedisStorage } = require("fdk-extension-javascript/storage");; //RedisStorage class is provided by default. If you have implemented custom storage class, use <YourCustomStorageClass> here.
const Redis = require("ioredis");
const app = fastify({logger: true});

app.register(require('@fastify/cookie'), {
  secret: ['ext.session']
});
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
  api_key: "<API_KEY>",
  api_secret: "<API_SECRET>",
  base_url: baseUrl, // this is optional
  scopes: ["company/products"], // this is optional
  callbacks: extensionHandler,
  storage: new RedisStorage(redis),
  access_mode: "offline",
  cluster: "https://api.fyndx0.de", // this is optional by default it points to prod.
});
app.register(fdkExtension.fdkHandler);

app.listen(8080);
```

Refer to [paramerter](http://linktoreadme) table of a setupFdk function.

#### How to call platform apis?

To call a platform API, you need an instance of `PlatformClient`. You can obtain a `platformClient` instance by using the `getPlatformClient` method of the `setupFDK` function. This instance encompasses methods for SDK classes enabling the invocation of platform APIs.
> To access the `PlatformClient` instance, a valid `session` is required, retrievable through the `getSessionData` method of an fdkClient. 
> To enforce this requirement, we propose adding a Fastify `pre-handler` (middleware) hook that allows platform requests only after the extension has been launched under any company.

```javascript
const apiRoutes = async (fastify, options) => {
  
  // This hook will get called by every api register under apiRoutes scope for authorization of a user request
  fastify.addHook('preHandler', async (req, res) => {
      try {
          req.fdkSession = await fdkClient.getSessionData(sessionId); // Get the session id from cookies or jwt token or any other form 
          if (!req.fdkSession) {
            return res.status(401).send({ "message": "unauthorized" });
          }
      } catch (error) {
          throw error
      }
  });
  
  fastify.register(function (fastify, opts, done) {
    fastify.get('/test/routes', async function view(req, res) {
      const platformClient = await fdkClient.getPlatformClient(company_id, req.fdkSession);
      const data = await platformClient.lead.getTickets();
      res.send(data);
    }); 
    done();
  }, { prefix: '/api/v1.0' });
};

app.register(fdkClient.apiRoutes);
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
    res.status(404).json({ success: false });
  }
}
```
#### How to call application apis?

To interact with an application's API using Fastify, you must have an instance of `ApplicationClient`. Fastify simplifies this process by offering a `plugin` called `applicationProxyRoutes` via `fdkClient`. You need to register this plugin within your router's scope, and it will automatically attach the ApplicationClient instance to the `req` (request) object for convenient access during API calls.

```javascript
const applicationProxyRoutes = async (fastify, options) => {
  fastify.register(fdkClient.applicationProxyRoutes);
  
  fastify.register(function (fastify, opts, done) {
    fastify.get('/test/routes', async function view(req, res) {
      const data = await req.applicationClient.lead.getTickets();
      res.send(data);
    }); 
    done();
  }, { prefix: '/app/proxy' });
};
```


#### How to register for webhook events?

Webhook events can be helpful to handle tasks when certain events occur on platform. You can subscribe to such events by passing `webhook_config` in setupFdk function.
 
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
    api_path: "/api/v1/webhooks", // required
    notification_email: "test@abc.com", // required
    subscribe_on_install: false, //optional. Default true
    subscribed_saleschannel: 'specific', //optional. Default all
    event_map: { // required
      'company/brand/create': {
        version: '1',
        handler: handleBrandCreate
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