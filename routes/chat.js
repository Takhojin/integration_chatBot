"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = async function (fastify, opts) {
  fastify.post(
    "/chat",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
        },
      },
    },
    tagAndembed
  );
  fastify.get(
    "/chat/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: {
            uuid: { type: "string" },
          },
        },
      },
    },
    answer
  );

  const prisma = fastify.prisma;
  const openAI = fastify.openAI;
  const token = fastify.tokens;
  const ticket = fastify.redis;

  async function tagAndembed(request, reply) {
    const { input } = request.body;
    if (!input) {
      reply.code(400).send({ error: "INVAILID_INPUT" });
    }
    const tag = await openAI.getTag(input);

    const embediing = await openAI.getEmbedding(input);
    // data type이 vector는 지원하지않기 때문에 string으로 바꿔줘야함
    const vector = "[" + embediing.toString() + "]";
    const queryResult =
      await prisma.$queryRaw`SELECT id, title, subtitle, contents, summary_1, summary_2, contents_tokens,tag, url, source , 1 - (contents_vector <=> ${vector}::vector) as cosine_similarity 
      FROM "members_documents" 
      WHERE tag = ${tag}
       AND is_summary_1_ok = true
       AND is_tag_ok = true
       AND is_similar_vector_exists = false 
       AND 1 - (contents_vector <=> ${vector}::vector) > 0
      order by 1 - (contents_vector <=> ${vector}::vector) 
      desc limit 4 ;`;
    if (!queryResult[0]) {
      return reply.code(404).send({ mesasge: "NOT_FOUND_DATA" });
    }
    // input 토큰 개수 계산
    const inputTokens = token(input);
    // 가져온 데이터의 토큰수의 합
    let dataTokens = 0;
    // 만약 토큰수가 16k 이상일 경우 제거된 토큰
    let droppedTokens = 0;
    // 빈 배열 선언 ( 데이터를 새롭게 푸쉬하기 위해서 필요)
    const result = [];
    // 반복문이 실행되면서 토큰의 합을 구한다. 길이는 가져온 데이터 배열의 길이만큼 실행
    // 중요한건 dataTokens 실행되고 밑에줄이 실행된다는 사실
    for (let i = 0; i < queryResult.length; i++) {
      dataTokens += queryResult[i].contents_tokens;
      // 토큰의 합이 16000이라면 빈배열의 요소들을 push
      // 토큰의 합이 16000초과하면 push하지말고 제거된 토큰의 합을 구한다.
      dataTokens < 16000
        ? result.push(queryResult[i])
        : (droppedTokens += queryResult[i].contents_tokens);
    }
    // 최종적인 토큰 갯수도 다시 출력
    dataTokens = dataTokens - droppedTokens;
    // 총 토큰수 계산
    const totalToken = inputTokens + dataTokens;
    // 답변도출하는데 필요한 정보들
    const ticketData = {
      question: input,
      content: result,
      tokens: totalToken,
    };
    // ticket 발급
    const ticketId = uuidv4();
    await ticket.createTicket(ticketId, "create", ticketData);
    reply.send({ ticketId });
  }

  async function answer(request, reply) {
    const ticketId = request.params.id;
    if (!ticketId || !input) {
      return reply.code(400).send({ error: "INVALID_TICKET" });
    }
    openAI.openAI - answer(ticketId);

    if (input.status === "complete") {
      const AI = await ticket.getTicket(ticketId);
      const result = AI.answer;

      const response = { apiAnswer: result };
      // 뽑아온 데이터의 배열에 push
      input.data.content.push(response);
      ticket.delTicket(ticketId);

      // 출력
      return input.data.content;
    }
    reply.code(202).send({ message: "IN_PROGRESS" });
  }
};
