'use strict';
// require('../init');
// global mock import should be always first to work mocking.
// const globalMock = require("./mocks/global.mock");
const logger = require("./utils/logger");

const db = require("./helpers/setup_db");
const server = require("./helpers/server");
const fs = require('fs');
const path = require('path');

beforeAll(async () => {
    logger.info("beforeAll:started");
    //jasmine.addMatchers(jsonSchemaMatcher);
    logger.info("beforeAll:completed");
    // done();
}, 50000);

afterAll(async () => {
    logger.info("afterAll:started");
    // globalMock.restore();
    await db.clearData();
    server.app.close();
    const dbPath = path.join(__dirname, '..', 'session_storage.db');
    // Check if the file exists and delete it
    fs.unlink(dbPath, (err) => {
      if (err) {
        console.error(`Failed to delete the database: ${err.message}`);
      } else {
        console.log('Database deleted successfully.');
      }
    });
    db.disconnect();
    logger.info("afterAll:completed");
    // done();
}, 20000);