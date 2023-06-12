"use strict";

// Read the .env file.
require("dotenv").config();

const fastify = require("fastify")({
  logger: true,
});

const appService = require("./app.js");
fastify.register(appService);

const closeListeners = closeWithGrace(
  { delay: process.env.FASTIFY_CLOSE_GRACE_DELAY || 500 },
  async function ({ signal, err, manual }) {
    if (err) {
      app.log.error(err);
    }
    await app.close();
  }
);

fastify.addHook("onClose", (instance, done) => {
  closeListeners.uninstall();
  done();
});

// Start listening.
fastify.listen({ port: process.env.PORT }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
