// plugins/redis.js

const fp = require("fastify-plugin");
// redis의 상위버전
const Redis = require("ioredis");

module.exports = fp(async function (fastify, opts, done) {
  const redisConfig = {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT,
    legacyMode: true,
  };
  const redis = new Redis(redisConfig);

  // 작업 티켓 생성 함수
  function createTicket(ticketId, data) {
    return new Promise((resolve, reject) => {
      // Redis에 티켓 정보 저장
      // 10분뒤 자동파기 (answer에서 오류가 나거나 해서 사용되지않는다면)
      redis.set(ticketId, JSON.stringify(data), "EX", 600, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // 작업 상태 조회 함수
  function getTicketStatus(ticketId) {
    return new Promise((resolve, reject) => {
      // Redis에서 티켓 정보 가져오기
      redis.get(ticketId, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
  }

  // 작업 완료 함수
  function completeTicket(ticketId, result) {
    return new Promise((resolve, reject) => {
      // Redis에서 티켓 정보 제거
      redis.del(ticketId, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  fastify.decorate("redis", redis);
  fastify.decorate("createTicket", createTicket);
  fastify.decorate("getTicketStatus", getTicketStatus);
  fastify.decorate("completeTicket", completeTicket);

  done();
});
