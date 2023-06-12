// root/routes/chat/plugins/inputHander.js
"use strict";
const fp = require("fastify-plugin");
const { getEmbedding, getTag } = require("../../../plugins/openAI");
const fastify = require("fastify");

async function embeddingHandler(request, options) {
  const publisher = this.publisher;

  try {
    // 임베딩하기
    const inputEmbedding = await getEmbedding(request);
    // 발행할 메시지 구성
    const message = {
      data: inputEmbedding.embedding,
    };
    // 메시지 발행
    publisher.publish("embedding", JSON.stringify(message));
  } catch (error) {
    throw error;
  }
}

async function tagHandler(request, reply) {
  try {
    const publisher = this.publisher;
    // tag db에서 가져오기
    const tagData = await this.prisma.members_documents.findMany({
      select: { tag: true },
      distinct: ["tag"],
    });
    // tag 데이터를 넘겨주고 결과값 가져오기
    const tagRequest = { question: request, taggingData: tagData };
    const tagging = await getTag(tagRequest);
    // 만약 tag값이 여러개일 경우를 대비해서 배열로 바꿔주기
    // where in 조건에 사용하기 위해서 '' 한번더 감싸기
    const taggingFormat = tagging.map((tag) => `'${tag}'`);

    const message = {
      data: taggingFormat,
    };
    // 메시지 발행
    publisher.publish("tag", JSON.stringify(message));
  } catch (error) {
    throw error;
  }
}

async function columnHandler(request, reply) {
  try {
    const publisher = this.publisher;
    // DB에 저장된 column 뽑아오기
    // 유지보수 측면에서 select column나열보다는 vector 들어간 열을 제외하기 위해서
    const columnQuery = `SELECT column_name FROM information_schema.columns WHERE table_name = 'members_documents';`;
    const columns = await this.prisma.$queryRaw(this.Prisma.raw(columnQuery));
    // 객체로 나온 결과를 하나의 배열로 묶기
    const columnNames = columns.map((column) => column.column_name);
    // vector가 포함된 컬럼은 제외하고 알파벳 순으로 정렬
    const filteredColumnNames = columnNames
      .filter((columnName) => !columnName.includes("vector"))
      .sort();
    // 쿼리문에 사용하기위해 스트링으로 변경
    const columnNamesString = filteredColumnNames.join(", ");

    // 발행할 메시지 구성
    const message = {
      data: columnNamesString,
    };

    // 메시지 발행
    publisher.publish("column", JSON.stringify(message));
  } catch (error) {
    throw error;
  }
}
module.exports = fp(async function (fastify, opts, done) {
  fastify.decorate("embeddingHandler", embeddingHandler);
  fastify.decorate("columnHandler", columnHandler);
  fastify.decorate("tagHandler", tagHandler);

  // console.log("------------------------------------");
  // console.log(fastify.hasDecorator("publisher"));
  // console.log("------------------------------------");
});
