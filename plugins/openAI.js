// root/plusgins/openAI.js
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
    throw error;
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
          content: `${question} 이 내용과 관련된 카테고리를 뽑아줘 \n 반드시 '${tagCondition}' \n 이 안의 내용에서 뽑아줘 \n 반드시 카테고리:예시카테고리 이런 형식으로 뽑아줘 \n 반드시 1개에서 2개 정도만 뽑아줘`,
        },
      ],
      temperature: 0,
    });
    // 태그 결과
    const response = completion.data.choices[0].message.content;
    // 태그결과중 " 카테고리 : "를 제외한 정보 전달
    const trimmedResponse = response.replace(/카테고리: /g, "").split(",");

    return trimmedResponse;
  } catch (error) {
    throw error;
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
    throw error;
  }
}
module.exports = { getEmbedding, getTag, getResponse };
