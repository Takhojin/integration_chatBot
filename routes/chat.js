"use strict";
const { getEmbedding, getResponse, getTag } = require("../plugins/openAI");

module.exports = async function (fastify, opts) {
  fastify.post("/chat", chat);

  async function chat(request, reply) {
    const { input } = request.body;

    try {
      // redis 호출
      const redis = fastify.redis;
      // redis 서버에 저장되어있다면 불러와서 바로 return
      const redisResult = await redis.get(input);
      if (redisResult) {
        const parsedResult = JSON.parse(redisResult);
        return parsedResult;
      }
      // tag db에서 가져오기
      const tagData = await fastify.prisma.members_documents.findMany({
        select: { tag: true },
        distinct: ["tag"],
      });
      // tag 데이터를 넘겨주고 결과값 가져오기
      // 만약 tag값이 여러개일 경우를 대비해서 배열로 바꿔주기
      const tagRequest = { question: input, taggingData: tagData };
      // where in 조건에 사용하기 위해서 '' 한번더 감싸기
      const tagging = (await getTag(tagRequest)).map((tag) => `'${tag}'`);

      // 임배딩하기
      const inputEmbedding = await getEmbedding(input);

      // DB에 저장된 column 뽑아오기
      // 유지보수 측면에서 select column나열보다는 vector 들어간 열을 제외하기 위해서
      const columnQuery = `SELECT column_name FROM information_schema.columns WHERE table_name = 'members_documents';`;
      const columns = await fastify.prisma.$queryRaw(
        fastify.Prisma.raw(columnQuery)
      );
      // 객체로 나온 결과를 하나의 배열로 묶기
      const columnNames = columns.map((column) => column.column_name);
      // vector가 포함된 컬럼은 제외하고 알파벳 순으로 정렬
      const filteredColumnNames = columnNames
        .filter((columnName) => !columnName.includes("vector"))
        .sort();
      // 쿼리문에 사용하기위해 스트링으로 변경
      const columnNamesString = filteredColumnNames.join(", ");

      // tag목록과 embedding결과로 데이터 뽑아오기
      const inputVector = "[" + inputEmbedding.embedding.toString() + "]";
      let vectorQuery = `SELECT ${columnNamesString} , 1 - (contents_vector <=> '${inputVector}') as cosine_similarity FROM "members_documents" WHERE tag IN (${tagging}) order by 1 - (contents_vector <=> '${inputVector}') desc limit 4 ;`;
      let vectorResult = await fastify.prisma.$queryRaw(
        fastify.Prisma.raw(vectorQuery)
      );
      // 태그가 형식에 맞지 않는다면 where 조건문을 빼고 모든 데이터에서 조회
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

      //redis 서버에 저장된 값이 없다면 저장하기 만료시간 10분
      await redis.set(input, JSON.stringify(vectorResult), "EX", 600);

      // 출력
      return vectorResult;
    } catch (error) {
      console.log(error);
      reply.code(400).send({ error: "chat" });
    }
  }
};
