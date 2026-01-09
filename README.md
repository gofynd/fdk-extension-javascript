# FDK Extension JavaScript (External Partner Guide)

Build Fynd platform extensions with an Express-first helper library that handles authentication, API clients, and webhook registration for you. This guide is tailored for external partners who want fast, production-ready integration.

## Install

```bash
npm install @gofynd/fdk-extension-javascript
```

## Quick Start

```javascript
const bodyParser = require("body-parser");
const express = require("express");
const cookieParser = require("cookie-parser");
const { setupFdk } = require("@gofynd/fdk-extension-javascript/express");
const { RedisStorage } = require("@gofynd/fdk-extension-javascript/express/storage");
const Redis = require("ioredis");

const app = express();
app.use(cookieParser("ext.session"));
app.use(bodyParser.json({ limit: "2mb" }));

const redis = new Redis();

const extensionHandler = {
  auth: async function (data) {
    console.log("called auth callback");
  },
  uninstall: async function (data) {
    console.log("called uninstall callback");
  },
};

const fdkClient = setupFdk({
  api_key: "<API_KEY>",
  api_secret: "<API_SECRET>",
  base_url: "https://your-domain.com", // optional, defaults to extension base_url
  scopes: ["company/products"], // optional; defaults to extension scopes
  callbacks: extensionHandler,
  storage: new RedisStorage(redis),
  access_mode: "offline",
});

app.use(fdkClient.fdkHandler);
app.listen(8080);
```

## Configuration reference

| Key | Required | Description |
| --- | --- | --- |
| `api_key` | Yes | Extension API key from Fynd partner dashboard. |
| `api_secret` | Yes | Extension API secret from Fynd partner dashboard. |
| `base_url` | No | Public URL for your extension (used for redirects and webhooks). |
| `scopes` | No | Override extension scopes. Must be a subset of registered scopes. |
| `callbacks` | Yes | `auth` and `uninstall` handlers. |
| `storage` | Yes | Session storage adapter (Redis, SQLite, memory, or custom). |
| `access_mode` | No | `offline` (default) or `online`. |
| `webhook_config` | No | Webhook registration configuration. |
| `debug` | No | Enable debug logging. |
| `cluster` | No | API cluster override. |

## Call platform APIs (HTTP routes)

When you register routes under `platformApiRoutes`, the middleware injects a `platformClient` into the request.

```javascript
fdkClient.platformApiRoutes.get("/test/routes", async (req, res, next) => {
  try {
    const data = await req.platformClient.lead.getTickets();
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.use(fdkClient.platformApiRoutes);
```

## Call platform APIs (background jobs)

```javascript
async function backgroundHandler(companyId) {
  try {
    const platformClient = await fdkClient.getPlatformClient(companyId);
    const data = await platformClient.lead.getTickets();
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
```

> Background access requires `access_mode: "offline"`.

## Call partner APIs (HTTP routes)

```javascript
fdkClient.partnerApiRoutes.get("/test/routes", async (req, res, next) => {
  try {
    const data = await req.partnerClient.lead.getTickets();
    res.json(data);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

app.use(fdkClient.partnerApiRoutes);
```

## Call partner APIs (background jobs)

```javascript
async function backgroundHandler(organizationId) {
  try {
    const partnerClient = await fdkClient.getPartnerClient(organizationId);
    const data = await partnerClient.webhook.responseTimeSummary({
      extensionId: "<EXTENSION_ID>",
      startDate: "<START_DATE>",
      endDate: "<END_DATE>",
    });
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
```

> Background access requires `access_mode: "offline"`.

## Webhooks

### Register webhook events

```javascript
const fdkClient = setupFdk({
  api_key: "<API_KEY>",
  api_secret: "<API_SECRET>",
  callbacks: extensionHandler,
  storage: new RedisStorage(redis),
  access_mode: "offline",
  webhook_config: {
    api_path: "/api/v1/webhooks",
    notification_email: "partner@example.com",
    subscribe_on_install: true,
    subscribed_saleschannel: "all",
    event_map: {
      "company/brand/create": {
        version: "1",
        handler: handleBrandCreate,
        provider: "rest",
      },
      "application/coupon/create": {
        version: "1",
        topic: "coupon_create_kafka_topic",
        provider: "kafka",
      },
    },
  },
  debug: true,
});
```

### Handle webhook requests

```javascript
app.post("/api/v1/webhooks", async (req, res) => {
  try {
    await fdkClient.webhookRegistry.processWebhook(req);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});
```

### Saleschannel scoping

If you want to subscribe only to specific sales channels, set:

```javascript
webhook_config: {
  subscribed_saleschannel: "specific",
  subscribed_saleschannel_ids: ["application_id_1", "application_id_2"],
}
```

> If `subscribed_saleschannel` is set to `specific` with an empty `subscribed_saleschannel_ids` list, no saleschannel-specific events will be delivered.

### Filters and reducers

```javascript
webhook_config: {
  api_path: "/v1.0/webhooks",
  notification_email: "partner@example.com",
  subscribed_saleschannel: "specific",
  subscribed_saleschannel_ids: ["application_id_1"],
  event_map: {
    "company/brand/update": {
      version: "1",
      handler: handleExtensionUninstall,
      filters: {
        query: "$.brand.uid",
        condition: "(uid) => uid === 238",
      },
      reducer: {
        brand_name: "$.brand.name",
        logo_link: "$.brand.logo",
      },
    },
  },
}
```

### Sync webhook configuration

If you update your webhook configuration, call `syncEvents` to upsert the configuration for a specific company:

```javascript
await fdkClient.webhookRegistry.syncEvents(req.platformClient);
```

## Custom storage

See the custom storage guide: [express/storage/README.md](express/storage/README.md).
