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
  const publisher = new Redis(redisConfig);
  const subscriber = new Redis(redisConfig);

  fastify.decorate("redis", redis);
  fastify.decorate("publisher", publisher);
  fastify.decorate("subscriber", subscriber);

  // 채널 생성
  await subscriber.subscribe("embedding", "column", "tag");
  console.log("Subscribed to channels: 'embedding', 'column', 'tag'.");

  fastify.addHook("onClose", async () => {
    await redis.quit();
    await publisher.quit();
    await subscriber.quit();
  });
  done();
});
