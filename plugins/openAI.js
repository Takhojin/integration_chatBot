// root/plusgins/openAI.js
const fp = require("fastify-plugin");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// 임배딩한 결과를 얻는 함수
async function getEmbedding(request, reply) {
  try {
    const embedding = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: request,
    });
    const embeddingResult = embedding.data.data[0];
    return embeddingResult;
  } catch (error) {
    console.log(error);
    reply.code(400).send({ error: "getEmbedding" });
  }
}

// tag값을 출력하는 함수
async function getTag(request, reply) {
  const allData = request;
  const question = allData.question;
  const tag = allData.taggingData;

  // request로 들어온 태그 데이터를 하나로 묶기
  const tagDataes = [];
  for (let i = 0; i < tag.length; i++) {
    const tagData = tag[i].tag;
    tagDataes.push(tagData);
  }

  const tagCondition = tagDataes.join(", ");
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: `Please extract categories related to '${question}'. Only extract from '${tagCondition}'. Extract in the format of 'category1', 'category2' must wrapped in single quotation marks, separated by commas and so on Please extract only 1 to 2 categories.`,
        },
      ],
      temperature: 0,
    });

    // 태그 결과
    const response = completion.data.choices[0].message.content;
    return response;
  } catch (error) {
    console.log(error);
    reply.code(400).send({ error: "getTag" });
  }
}

//답변을 출력하는 함수
async function getResponse(request, reply) {
  const input = request;
  // 토큰 갯수에따라 모델명을 달리 하기
  let aiModel = "";
  aiModel = input.tokens > 4000 ? "gpt-3.5-turbo-16k" : "gpt-3.5-turbo";

  // data중 contents를 하나의 배열로 합치기
  const systemMessages = [];
  for (let i = 0; i < input.resData.length; i++) {
    const inputData = input.resData[i].contents;
    systemMessages.push(inputData);
  }
  // 배열을 하나의 스트링으로 합치기
  const messageCondition = systemMessages.join(", ");
  try {
    const completion = await openai.createChatCompletion({
      model: aiModel,
      messages: [
        {
          role: "user",
          content: ` ${messageCondition} \n 여기 내용을 참고해서 \n ${input.question}\n 여기에 답변을 해줘 `,
        },
      ],
      temperature: 0,
    });

    return completion.data.choices[0].message.content;
  } catch (error) {
    console.log(error);
    reply.code(400).send({ error: "getResponse" });
  }
}
module.exports = fp(async function (fastify, opts, done) {
  fastify.decorate("getEmbedding", getEmbedding);
  fastify.decorate("getTag", getTag);
  fastify.decorate("getResponse", getResponse);
  done();
});
