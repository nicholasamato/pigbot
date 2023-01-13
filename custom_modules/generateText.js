require('dotenv').config();

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function generateText(prompt){
    const response = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        max_tokens: 280,
        temperature: 0.6,
      });
    return response.data.choices[0].text;;
}

module.exports = generateText;