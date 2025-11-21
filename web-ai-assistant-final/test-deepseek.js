require("dotenv").config();
const axios = require("axios");

console.log("是否读到 API KEY：", !!process.env.OPENAI_API_KEY);

axios
  .post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: "deepseek-chat",
      messages: [
        { role: "user", content: "你好，请简单介绍一下你是谁？" }
      ],
      max_tokens: 50
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  )
  .then((res) => {
    console.log("DeepSeek 调用成功：");
    console.log(res.data.choices[0].message.content);
  })
  .catch((err) => {
    console.error("DeepSeek 调用失败：");
    console.error(err.response?.data || err.message);
  });
