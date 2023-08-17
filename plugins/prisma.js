// root/plugins/prisma.js
"use strict";

const fp = require("fastify-plugin");
const { PrismaClient } = require("@prisma/client");

module.exports = fp(async function (fastify, opts, done) {
  const prisma = new PrismaClient();
  fastify.decorate("prisma", prisma);
});
