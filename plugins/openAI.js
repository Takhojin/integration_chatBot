// root/plusgins/openAI.js
const fp = require("fastify-plugin");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_API_KEY,
});

const openai = new OpenAIApi(configuration);

module.exports = fp(async function (fastify, opts, done) {
  // 임배딩한 결과를 얻는 함수
  async function getEmbedding(request, reply) {
    try {
      const embedding = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: request,
      });
      const result = embedding.data.data[0].embedding;
      return result;
    } catch (error) {
      console.log(error);
      reply.code(400).send({ error: "FAILD_EMBADDING" });
    }
  }

  // tag값을 출력하는 함수
  async function getTag(request, reply) {
    const categories = [
      "온라인마케팅",
      "주간회의",
      "하이라이트",
      "직원관리",
      "가이드라인",
      "진료프로그램",
      "구매관리",
      "직원교육",
      "비용관리",
      "내규관리",
      "환자브리핑",
      "인사이트",
      "지표관리",
      "채용관리",
      "공간관리",
      "원내커뮤니케이션",
      "조직",
      "리더십",
      "업무기초",
      "환자상담",
      "환자접점관리",
      "인센티브",
      "케이스",
      "상권분석",
      "오프라인마케팅",
      "소개환자관리",
      "노무",
      "린브랜딩",
      "평가",
      "온보딩관리",
    ];
    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: `Please extract the tags from the user's question '${request}' based on '${categories}'. Only extract tags that are present in '${categories}'.  Only one tag should be outputted, and it must be formatted by removing whitespace. For example tag.`,
          },
        ],
        temperature: 0,
      });

      // 태그 결과
      const result = completion.data.choices[0].message.content;

      return result;
    } catch (error) {
      console.log(error);
      reply.code(400).send({ error: "FAILD_TAG" });
    }
  }

  //답변을 출력하는 함수
  async function getAnswer(request, reply) {
    const ticket = fastify.redis;
    const ticketId = request;
    const input = await ticket.getTicket(ticketId);

    if (input.status === "create") {
      await ticket.createTicket(ticketId, "progress");
      // 토큰 갯수에 따라 모델명을 달리 하기
      let aiModel = "";
      aiModel =
        input.data.tokens > 4000 ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo";

      // data 중 contents를 하나의 배열로 합치기
      const systemMessages = [];
      for (let i = 0; i < input.data.content.length; i++) {
        const inputData = input.data.content[i].contents;
        systemMessages.push(inputData);
      }
      // 배열을 하나의 스트링으로 합치기
      const messageCondition = systemMessages.join(", ");

      const completion = await openai.createChatCompletion({
        model: aiModel,
        messages: [
          {
            role: "user",
            content: `Given the question: ${input.data.question}, please provide an answer in Korean based on the contents ${messageCondition} which are arranged in descending order of relevance to the given question.`,
          },
        ],
        temperature: 0.3,
      });
      const result = completion.data.choices[0].message.content;
      await ticket.createTicket(ticketId, "complete", input.data, result);
    }
  }
  fastify.decorate("openAI", { getEmbedding, getTag, getAnswer });
});
