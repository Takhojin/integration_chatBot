const assert = require("node:assert");
const { encoding_for_model } = require("@dqbd/tiktoken");
const fp = require("fastify-plugin");

const enc = encoding_for_model("gpt-3.5-turbo");

module.exports = fp(async function (fastify, opts, done) {
  fastify.decorate("tokens", (text) => {
    // 들어온 값을 토큰화하고 다시 문자로 돌렸을때 그 값이 같은지 확인
    assert(new TextDecoder().decode(enc.decode(enc.encode(text))) === text);
    const tokens = enc.encode(text);
    return tokens.length;
  });
  fastify.addHook("onClose", (instance, done) => {
    enc.free();
    done();
  });
  done();
});
