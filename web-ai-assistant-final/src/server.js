// server.js —— DeepSeek + 网页抓取 + 静态 index.html

console.log("===== SERVER.JS START =====");

process.on("uncaughtException", (err) => {
  console.error("🔥 uncaughtException:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("🔥 unhandledRejection:", reason);
});

const path = require("path");
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5002;

console.log("Node 版本：", process.version);
console.log("是否读取 DEEPSEEK_API_KEY:", !!process.env.DEEPSEEK_API_KEY);

// 解析 JSON
app.use(express.json());

// 静态文件目录：当前 src 目录
app.use(express.static(__dirname));

// 主页：返回 index.html（就在 src 目录下）
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ====== 抓取网页 ======
async function fetchPageText(url) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);
    return $("body").text().replace(/\s+/g, " ").slice(0, 5000);
  } catch (err) {
    console.error("❌ fetchPageText 抓取失败：", err.message);
    return "";
  }
}

// ====== DeepSeek 问答 ======
async function askDeepSeek(prompt) {
  try {
    const res = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        timeout: 20000,
      }
    );

    return res.data.choices[0].message.content;
  } catch (err) {
    console.error("❌ DeepSeek 调用失败：", err.response?.data || err);
    return `【AI 暂时不可用】\n错误信息：${err.message}`;
  }
}

// ====== /ask API ======
app.post("/ask", async (req, res) => {
  console.log("📩 收到 /ask 请求：", req.body);

  const { url, question } = req.body;

  if (!url || !question) {
    return res.json({ answer: "url / question 缺失" });
  }

  const pageText = await fetchPageText(url);

  const prompt = `
你是一名网页信息引导助手。
以下是网页内容：${pageText}

用户问题：${question}
请根据网页内容回答。`;

  const answer = await askDeepSeek(prompt);

  return res.json({ answer, raw: pageText });
});

// ====== 启动服务器 ======
const server = app.listen(PORT, () => {
  console.log(`服务器已启动，监听端口: ${PORT}`);
});

server.on("error", (err) => {
  console.error("💥 server error:", err);
});

// 心跳日志（可有可无）
setInterval(() => {
  console.log("⏱ 心跳：进程仍在运行");
}, 15000);
