require("@babel/register");
const { Test } = require("@nestjs/testing");
const superTest = require("supertest");
const { TestModule } = require("./nest/test.module");
const fdkHelper = require("../helpers/fdk");
const cookieParser = require("cookie-parser");
const { SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME } = require("../../lib/constants");
const { clearData } = require("../helpers/setup_db");
const { userHeaders, applicationHeaders } = require("./constants");

describe("Nestjs --> Extension launch flow", () => {
  let app;
  let webhookConfig = null;
  let request;
  let fdk_instance;
  let cookie= "";
  let queryParams = "";
  let admCookie = "";
  let admQueryParams = ""
  beforeAll(async () => {
    webhookConfig = {
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
    fdk_instance = await fdkHelper.initializNestFDK({
      access_mode: "offline",
      webhook_config: webhookConfig,
      debug: true,
    });
    const moduleFixture = await Test.createTestingModule({
      imports: [TestModule],
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

  it("/fp/uninstall", async () => {
    let response = await request.post("/fp/uninstall").send({ company_id: 1 });
    expect(response.status).toBe(200);
  });
  
  it('Should set user and application configs in request object while using applicationProxyroutes', async () => {
    let response = await request
        .get('/app/applications')
        .set('x-company-id', 1)
        .set('cookie', `${SESSION_COOKIE_NAME}_1=${cookie}`)
        .set(userHeaders)
        .set(applicationHeaders)
        .send();
    expect(response.status).toBe(200);
    expect(response.body.user_id).toBe('5e199e6998cfe1776f1385dc');
  });
  
  it('/adm/install should return redirect url', async () => {
    let response = await request
        .get('/adm/install?organization_id=1&install_event=true')
        .send();
    
    admCookie = response.headers['set-cookie'][0].split(",")[0].split("=")[1];
    admQueryParams = response.headers['location'].split('?')[1];
    expect(response.status).toBe(302);
  });
  
  it('/adm/auth should return redirect url', async () => {
    let response = await request
        .get(`/adm/auth?organization_id=1&install_event=true&${admQueryParams}`)
        .set('cookie', `${ADMIN_SESSION_COOKIE_NAME}=${admCookie}`)
        .send();
    expect(response.status).toBe(302);
  });

});
