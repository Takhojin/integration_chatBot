"use strict";

// Read the .env file.
require("dotenv").config();

const fastify = require("fastify")({
  logger: true,
});

// Start listening.
fastify.listen({ port: process.env.PORT }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
