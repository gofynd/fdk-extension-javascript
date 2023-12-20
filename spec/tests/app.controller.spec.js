require("@babel/register");
const { Test, TestingModule } = require("@nestjs/testing");
const { INestApplication } = require("@nestjs/common");
const superTest = require("supertest");
const { AppModule } = require("../../nest/app.module");
const fdkHelper = require("../helpers/fdk");
const cookieParser = require("cookie-parser");
const { SESSION_COOKIE_NAME } = require("../../constants");
const { clearData } = require("../helpers/setup_db");

describe("Nestjs --> Extension launch flow", () => {
  let app;
  let webhookConfig = null;
  let request;
  let fdk_instance;
  beforeAll(async () => {
    webhookConfig = {
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
    fdk_instance = await fdkHelper.initializNestFDK({
      access_mode: "offline",
      webhook_config: webhookConfig,
      debug: true,
    });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser("ext.session"));
    request = superTest(app.getHttpServer());
    await app.listen(3001);
    await app.init();
  });

  afterAll(async () => {
    await clearData();
  });

  it("/fp/install should return redirect url", async () => {
    let response = await request
      .get("/fp/install?company_id=1&install_event=true")
      .send();
    cookie = response.headers["set-cookie"][0].split(",")[0].split("=")[1];
    queryParams = response.headers["location"].split("?")[1];
    expect(response.status).toBe(302);
  });

  it("/fp/auth should return redirect url", async () => {
    let response = await request
      .get(`/fp/auth?company_id=1&install_event=true&${queryParams}`)
      .set("cookie", `${SESSION_COOKIE_NAME}_1=${cookie}`)
      .send();
    expect(response.status).toBe(302);
  });

  it("/fp/auto_install", async () => {
    let response = await request
      .post(`/fp/auto_install`)
      .send({ company_id: 1 });
    expect(response.status).toBe(200);
  });

  it("/fp/uninstall", async () => {
    let response = await request.post("/fp/uninstall").send({ company_id: 1 });
    expect(response.status).toBe(200);
  });
});
