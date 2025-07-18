'use strict';
const logger = require("./utils/logger");
const db = require("./helpers/setup_db");

beforeAll(async () => {
    logger.info("beforeAll:started");
    await db.connect(); // This is now a no-op but keeps interface consistent
    logger.info("beforeAll:completed");
}, 50000);

afterAll(async () => {
    logger.info("afterAll:started");
    await db.clearData();
    await db.disconnect(); // This is now a no-op but keeps interface consistent
    logger.info("afterAll:completed");
}, 20000);