"use strict";

const fp = require("fastify-plugin");

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
module.exports = fp(async function (fastify, opts) {
  fastify.register(require("@fastify/sensible"), {
    errorHandler: false,
  });
  //글로벌에러핸들러 등록
  fastify.setErrorHandler(async (error, request, reply) => {
    if (error.statusCode) {
      // 이미 상태 코드가 설정된 경우, 해당 상태 코드를 그대로 반환
      reply.code(error.statusCode).send({ error: error.message });
    } else {
      // 그 외의 경우 500 오류 응답을 반환
      reply.code(500).send({ error: "Internal Server Error" });
    }
  });
});
