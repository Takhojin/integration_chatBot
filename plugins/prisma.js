//root/plugins/prisma.js
"use strict";

const fp = require("fastify-plugin");
const { Prisma, PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = fp(async function (fastify, opts, done) {
  fastify.decorate("prisma", prisma);
  fastify.decorate("Prisma", Prisma);
});
