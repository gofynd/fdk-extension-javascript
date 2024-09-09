"use strict";

const fdkHelper = require("../helpers/fdk");
const { clearData } = require("../helpers/setup_db");
const request = require("../helpers/server");
const { SQLiteStorage } = require("../../lib/storage");
const { sqliteInstance } = require("../helpers/setup_db");
const { userHeaders, applicationHeaders, applicationId, applicationToken, jwtTokenData  } = require("./constants");
const { formRequestObject } = require('../../lib/utils');
const jwt = require('jsonwebtoken'); 
let JWT_SECRET_KEY = "__jwt_secret_key"

describe("Custom framework integration as express with jwt token - Extension launch flow", () => {
  let webhookConfig = {
    api_path: "/v1/webhooks",
    notification_email: "test@abc.com",
    subscribed_saleschannel: "specific",
    event_map: {
      "company/product/create": {
        version: '1',
        handler: function () { },
        provider: 'rest'
    },
      "application/coupon/create": {
        version: "1",
        handler: function () {
          throw Error("test error");
        },
      },
    },
  };
  let jwtToken = "";
  let queryParams = "";
  let fdk_instance = null;
  beforeAll(async () => {
    fdk_instance = await fdkHelper.initializeFDK({
      access_mode: "offline",
      webhook_config: webhookConfig,
    });
    const sqlite = new SQLiteStorage(sqliteInstance, "test_fdk");
    const handlers = fdk_instance.routerHandlers;
    let router = request.app.express.Router();

    router.get("/fp/install", async (req, res, next) => {
      let companyId = req.query.company_id;
      const { redirectUrl, fdkSession } = await handlers.extInstall(
        companyId,
        req.query.application_id,
        'test', // redirect path
        fdk_instance.extension
      );
      const jwtToken = jwt.sign({...fdkSession}, JWT_SECRET_KEY); 
      res.header('x-token', jwtToken);
      return res.redirect(redirectUrl);
    });

    router.get("/fp/auth", async (req, res, next) => {
      try {
        const token = req.headers['x-token']; 
        const sessionData = jwt.verify(token, JWT_SECRET_KEY);
        let sessionId = sessionData.id;
        req.fdkSession = await sqlite.get(sessionId);
        req.extension = fdk_instance.extension;
        const reqObj = formRequestObject(req);
        const { redirectUrl, fdkSession } = await handlers.extAuth(
          reqObj,
          req.query.state,
          req.query.code,
          fdk_instance.extension,
          sessionId
        );
        const jwtToken = jwt.sign({...fdkSession}, JWT_SECRET_KEY); 
        res.header('x-token', jwtToken);
        return res.redirect(redirectUrl);
      } catch (error) {
        next(error);
      }
    });

    router.post("/fp/uninstall", async (req, res, next) => {
      try {
        const reqObj = formRequestObject(req);
        await handlers.extUninstall(
          reqObj,
          req.body.company_id,
          fdk_instance.extension
        );
        return res.json({ success: true });
      } catch (error) {
        next(error);
      }
    });

    let apiRouter = request.app.express.Router();
    apiRouter.get(
      "/applications",
      async (req, res, next) => {
        const token = req.headers['x-token']; 
        const sessionData = jwt.verify(token, JWT_SECRET_KEY)
        let sessionId = sessionData.id;
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

    request.app.restApp.use("/custom_jwt/api", apiRouter);
    request.app.restApp.use("/custom_jwt/app", applicationRouter);
    request.app.restApp.use('/custom_jwt', router);
  });

  afterAll(async () => {
    await clearData();
  });

  it("/fp/install should return redirect url", async () => {
    let response = await request
      .get("/custom_jwt/fp/install?company_id=1&install_event=true")
      .send();
    jwtToken = response.headers['x-token'];
    queryParams = response.headers["location"].split("?")[1];
    expect(response.status).toBe(302);
  });

  it("/fp/auth should return redirect url", async () => {
    let response = await request
      .get(`/custom_jwt/fp/auth?company_id=1&install_event=true&${queryParams}`)
      .set("x-token", `${jwtToken}`)
      .send();
    expect(response.status).toBe(302);
  });

  it("Session middleware should get called on apiRoutes", async () => {
    let response = await request
      .get("/custom_jwt/api/applications?company_id=1")
      .set("x-token", `${jwtToken}`)
      .send();
    expect(response.status).toBe(200);
  });

  it("Session middleware should return unauthorized when session not found", async () => {
    let response = await request
      .get("/custom_jwt/api/applications")
      .set("x-token", `${jwtTokenData}`)
      .send();
    expect(response.status).toBe(401);
  });

  it("Should set application configs in request object while using applicationProxyroutes", async () => {
    let response = await request
      .get("/custom_jwt/app/applications?company_id=1")
      .set("x-token", `${jwtToken}`)
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

  it("/fp/install auth call back should contains application id", async () => {
    let response = await request
      .get(
        `/custom_jwt/fp/install?company_id=1&install_event=true&application_id=${applicationId}`
      )
      .send();
    let redirectUrl = response.headers["location"].split("?")[1];
    expect(redirectUrl).toContain("application_id");
    expect(response.status).toBe(302);
  });

  it("/fp/auth missing fdk session", async () => {
    let response = await request
      .get(`/custom_jwt/fp/auth?company_id=2&install_event=true&${queryParams}`)
      .set("x-token", `${jwtTokenData}`)
      .send();
    expect(response.status).toBe(500);
  });

  it("/fp/auth invalid fdk state", async () => {
    let response = await request
      .get(
        `/custom_jwt/fp/auth?company_id=1&install_event=true&${queryParams}&state=12345`
      )
      .set("x-token", `${jwtToken}`)
      .send();
    expect(response.status).toBe(500);
  });

  it("/fp/uninstall", async () => {
    let response = await request.post("/custom_jwt/fp/uninstall").send({ company_id: 1 });
    expect(response.status).toBe(200);
  });
});
