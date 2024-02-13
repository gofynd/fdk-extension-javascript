"use strict";

const fdkHelper = require("../helpers/fdk");
const { clearData } = require("../helpers/setup_db");
const request = require("../helpers/server");
const { RedisStorage } = require("../../storage");
const { redisConnection } = require("../helpers/setup_db");
const { SESSION_COOKIE_NAME } = require("../../constants");
const { userHeaders, applicationHeaders, applicationId, applicationToken  } = require("./constants");
const { formRequestObject } = require('../../utils');

describe("Custom framework integration as express - Extension launch flow", () => {
  let webhookConfig = {
    api_path: "/v1/webhooks",
    notification_email: "test@abc.com",
    subscribed_saleschannel: "specific",
    event_map: {
      "company/product/create": {
        version: "1",
        handler: function () { },
      },
      "application/coupon/create": {
        version: "1",
        handler: function () {
          throw Error("test error");
        },
      },
    },
  };
  let cookie = "";
  let queryParams = "";
  let fdk_instance;
  beforeAll(async () => {
    fdk_instance = await fdkHelper.initializeFDK({
      access_mode: "offline",
      webhook_config: webhookConfig,
    });
    const redis = new RedisStorage(redisConnection, "test_fdk");
    const handlers = fdk_instance.routerHandlers;
    let router = request.app.express.Router();

    router.get("/fp/install", async (req, res, next) => {
      let companyId = req.query.company_id;
      const { redirectUrl, fdkSession } = await handlers.fpInstall(
        companyId,
        req.query.application_id,
        fdk_instance.extension
      );

      const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
      res.cookie(compCookieName, fdkSession.id, {
        secure: true,
        httpOnly: true,
        expires: fdkSession.expires,
        signed: true,
        sameSite: "None",
      });
      res.redirect(redirectUrl);
    });

    router.get("/fp/auth", async (req, res, next) => {
      try {
        let companyId = parseInt(req.query.company_id);
        const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
        let sessionId = req.signedCookies[compCookieName];
        req.fdkSession = await redis.get(sessionId);
        req.extension = fdk_instance.extension;
        const reqObj = formRequestObject(req);
        const { redirectUrl, fdkSession } = await handlers.fpAuth(
          reqObj,
          req.query.state,
          req.query.code,
          fdk_instance.extension,
          sessionId
        );
        // Assuming follow our auth approach
        res.cookie(compCookieName, fdkSession.id, {
          secure: true,
          httpOnly: true,
          expires: fdkSession.expires,
          signed: true,
          sameSite: "None",
        });
        res.redirect(redirectUrl);
      } catch (error) {
        next(error);
      }
    });

    router.post("/fp/auto_install", async (req, res, next) => {
      try {
        const reqObj = formRequestObject(req);
        await handlers.fpAutoInstall(
          reqObj,
          req.body.company_id,
          req.body.code,
          fdk_instance.extension
        );
        res.json({ message: "success" });
      } catch (error) {
        next(error);
      }
    });
    router.post("/fp/uninstall", async (req, res, next) => {
      try {
        const reqObj = formRequestObject(req);
        await handlers.fpUninstall(
          reqObj,
          req.body.company_id,
          fdk_instance.extension
        );
        res.json({ success: true });
      } catch (error) {
        next(error);
      }
    });

    let apiRouter = request.app.express.Router();
    apiRouter.get(
      "/applications",
      async (req, res, next) => {
        // assuming to follow old approach
        let companyId = parseInt(req.query.company_id);
        const compCookieName = `${SESSION_COOKIE_NAME}_${companyId}`;
        let sessionId = req.signedCookies[compCookieName];
        req.fdkSession = await fdk_instance.getSessionData(sessionId);
        if (!req.fdkSession) {
          return res.status(401).json({ message: "User is unauthorized" });
        }
        next();
      },
      async (req, res, next) => {
        console.log(req.fdkSession);
        return res.status(200).send();
      }
    );

    let applicationRouter = request.app.express.Router();
    applicationRouter.get(
      "/applications",
      async (req, res, next) => {
        const user = await fdk_instance.getUserData(req.headers["x-user-data"]);
        req.user = user;
        
        const { application, applicationConfig, applicationClient } =
          await fdk_instance.getApplicationConfig(
            req.headers["x-application-data"],
            fdk_instance.extension
          );

        req.application = application;
        req.applicationConfig = applicationConfig;
        req.applicationClient = applicationClient;
        next();
      },
      async (req, res, next) => {
        return res.status(200).json({ user_id: req.user.user_id });
      }
    );

    request.app.restApp.use("/custom/api", apiRouter);
    request.app.restApp.use("/custom/app", applicationRouter);
    request.app.restApp.use('/custom', router);
  });

  afterAll(async () => {
    await clearData();
  });

  it("/fp/install should return redirect url", async () => {
    let response = await request
      .get("/custom/fp/install?company_id=1&install_event=true")
      .send();
    cookie = response.headers["set-cookie"][0].split(",")[0].split("=")[1];
    queryParams = response.headers["location"].split("?")[1];
    expect(response.status).toBe(302);
  });

  it("/fp/auth should return redirect url", async () => {
    let response = await request
      .get(`/custom/fp/auth?company_id=1&install_event=true&${queryParams}`)
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .send();
    expect(response.status).toBe(302);
  });

  it("Session middleware should get called on apiRoutes", async () => {
    let response = await request
      .get("/custom/api/applications?company_id=1")
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .send();
    expect(response.status).toBe(200);
  });

  it("Session middleware should return unauthorized when session not found", async () => {
    let response = await request
      .get("/custom/api/applications")
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .send();
    expect(response.status).toBe(401);
  });

  it("Should set application configs in request object while using applicationProxyroutes", async () => {
    let response = await request
      .get("/custom/app/applications?company_id=1")
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .set(userHeaders)
      .set(applicationHeaders)
      .send();
    expect(response.status).toBe(200);
    expect(response.body.user_id).toBe("5e199e6998cfe1776f1385dc");
  });

  it("Should return PlatformClient in offline mode", async () => {
    const client = await fdk_instance.getPlatformClient(1);
    expect(client).toBeDefined();
  });

  it("Should return  ApplicationClient in offline mode", async () => {
    const client = await fdk_instance.getApplicationClient(
      applicationId,
      applicationToken
    );
    expect(client.cart).toBeDefined();
  });

  it("/fp/auto_install", async () => {
    let response = await request
      .post(`/custom/fp/auto_install`)
      .send({ company_id: 1 });
    expect(response.status).toBe(200);
  });

  it("/fp/install auth call back should contains application id", async () => {
    let response = await request
      .get(
        `/custom/fp/install?company_id=1&install_event=true&application_id=${applicationId}`
      )
      .send();
    let redirectUrl = response.headers["location"].split("?")[1];
    expect(redirectUrl).toContain("application_id");
    expect(response.status).toBe(302);
  });

  it("/fp/auth missing fdk session", async () => {
    let response = await request
      .get(`/custom/fp/auth?company_id=2&install_event=true&${queryParams}`)
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .send();
    expect(response.status).toBe(500);
  });

  it("/fp/auth invalid fdk state", async () => {
    let response = await request
      .get(
        `/custom/fp/auth?company_id=1&install_event=true&${queryParams}&state=12345`
      )
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .send();
    expect(response.status).toBe(500);
  });

  it("/fp/uninstall", async () => {
    let response = await request.post("/custom/fp/uninstall").send({ company_id: 1 });
    expect(response.status).toBe(200);
  });
});
