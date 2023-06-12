// root/routes/chat/chat.js
"use strict";
const fastify = require("fastify")();
const { getResponse } = require("../../plugins/openAI");
const inputHandler = require("./plugins/inputHandler");

fastify.register(inputHandler);

module.exports = async function (fastify, opts) {
  const redis = fastify.redis;

  fastify.post("/", chat);

  async function chat(request, reply) {
    const { input } = request.body;
    const subscriber = fastify.subscriber;
    try {
      // redis 호출
      const redis = fastify.redis;
      // redis 서버에 저장되어있다면 불러와서 바로 return
      const redisResult = await redis.get(input);
      if (redisResult) {
        const parsedResult = JSON.parse(redisResult);
        return parsedResult;
      }
      // 임배딩 결과값 얻기

      let embeddingMessage = "";
      fastify.embeddingHandler(input, opts);
      // 기다리지 않고 바로 설정해버리길래 promise를 이용하여 설정까지 기다리게 하기
      await new Promise((resolve) => {
        subscriber.on("message", (embedding, message) => {
          embeddingMessage = JSON.parse(message);
          resolve(); // Promise 완료를 알리기 위해 resolve()호출
        });
      });
      const inputEmbedding = embeddingMessage.data;

      let columnMessage = "";
      fastify.columnHandler();
      await new Promise((resolve) => {
        subscriber.on("message", (column, message) => {
          columnMessage = JSON.parse(message);
          resolve();
        });
      });
      const columnNamesString = columnMessage.data;

      let tagMessage = "";
      fastify.tagHandler();
      await new Promise((resolve) => {
        subscriber.on("message", (column, message) => {
          tagMessage = JSON.parse(message);
          resolve();
        });
      });
      const taggingFormat = tagMessage.data;

      // tag목록과 embedding결과로 데이터 뽑아오기
      const inputVector = "[" + inputEmbedding.toString() + "]";
      let vectorQuery = `SELECT ${columnNamesString} , 1 - (contents_vector <=> '${inputVector}') as cosine_similarity FROM "members_documents" WHERE tag IN (${taggingFormat}) order by 1 - (contents_vector <=> '${inputVector}') desc limit 4 ;`;
      let vectorResult = await fastify.prisma.$queryRaw(
        fastify.Prisma.raw(vectorQuery)
      );

      // 태그가 형식에 맞지 않는다면 where 조건문을 빼고 모든 데이터에서 조회
      // let을 써도되는건가? let은 조금 위험한가?
      if (vectorResult[0] == undefined) {
        vectorQuery = `SELECT ${columnNamesString} , 1 - (contents_vector <=> '${inputVector}') as cosine_similarity FROM "members_documents"  order by 1 - (contents_vector <=> '${inputVector}') desc limit 4 ;`;
        vectorResult = await fastify.prisma.$queryRaw(
          fastify.Prisma.raw(vectorQuery)
        );
      }

      // gpt 모델 토큰으로 나누는 분기점 생성

      // 가져온 데이터의 토큰수의 합
      let dataTokens = 0;
      // 만약 토큰수가 16k 이상일 경우 제거된 토큰
      let droppedTokens = 0;
      // 빈 배열 선언 ( 데이터를 새롭게 푸쉬하기 위해서 필요)
      const filteredVectorResult = [];
      // 반복문이 실행되면서 토큰의 합을 구한다. 길이는 가져온 데이터 배열의 길이만큼 실행
      // 중요한건 dataTokens 실행되고 밑에줄이 실행된다는 사실
      for (let i = 0; i < vectorResult.length; i++) {
        dataTokens += vectorResult[i].contents_tokens;
        // 토큰의 합이 16000이라면 빈배열의 요소들을 push
        // 토큰의 합이 16000초과하면 push하지말고 제거된 토큰의 합을 구한다.
        dataTokens < 16000
          ? filteredVectorResult.push(vectorResult[i])
          : (droppedTokens += vectorResult[i].contents_tokens);
      }
      // 추가한 배열들을 다시 원래 결과로 선언
      vectorResult = filteredVectorResult;
      // 최종적인 토큰 갯수도 다시 출력
      dataTokens = dataTokens - droppedTokens;

      // input 토큰 개수 계산
      const inputTokens = fastify.tokens(input);
      // 총 토큰수 계산
      const totalToken = inputTokens + dataTokens;

      // 뽑아온 데이터로 답변 출력
      // gotResponse에게 전달해줄 정보들
      const resRequset = {
        question: input,
        resData: vectorResult,
        tokens: totalToken,
      };
      // gotResponse 함수 호출
      const gotRespnose = await getResponse(resRequset);
      // gotResponse 함수 결과값을 객체로 저장
      const response = { apiAnswer: gotRespnose };
      // 뽑아온 데이터의 배열에 push
      vectorResult.push(response);
      // 출력

      //redis 서버에 저장된 값이 없다면 저장하기 만료시간 10분
      await redis.set(input, JSON.stringify(vectorResult), "EX", 600);
      return vectorResult;
    } catch (error) {
      console.log(error);
      reply.code(400).send({ error: "chat" });
    }
  }
};
