"use strict";

const fp = require("fastify-plugin");
const postgres = require("@fastify/postgres");

module.exports = fp(async function (fastify, opts) {
  fastify.register(postgres, {
    connectionString: process.env.DATABASE_URL,
  });
  fastify.decorate("postgres", fastify.pg);

  fastify.addHook("onClose", async () => {
    await fastify.pg.close();
  });
});
