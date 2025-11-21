// server.js —— 云部署版（DeepSeek + 网页抓取 + 前后端同域）

console.log("===== SERVER.JS START =====");

process.on("uncaughtException", (err) => {
  console.error("🔥 uncaughtException 捕获到错误：", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("🔥 unhandledRejection 捕获到错误：", reason);
});

const path = require("path");
console.log("当前运行文件路径:", __filename);

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

// ✅ 云平台会通过环境变量 PORT 告诉你端口，
// 本地跑的时候可以默认 5002
const PORT = process.env.PORT || 5002;

console.log("Node 版本：", process.version);
console.log("是否读取 DEEPSEEK_API_KEY:", !!process.env.DEEPSEEK_API_KEY);

app.use(express.json());

// 静态文件：当前目录
app.use(express.static(__dirname));

// 根路径返回 index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// （可选）简单缓存，避免反复抓同一网页
const pageCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 分钟

async function fetchPageText(url) {
  if (!url) return "";

  const now = Date.now();
  const cached = pageCache.get(url);
  if (cached && now - cached.time < CACHE_TTL) {
    console.log("⚡ 命中缓存：", url);
    return cached.text;
  }

  try {
    console.log("🌐 抓取网页：", url);
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 15000,
    });

    const $ = cheerio.load(res.data);
    const text = $("body").text().replace(/\s+/g, " ").slice(0, 5000);

    pageCache.set(url, { text, time: now });
    return text;
  } catch (err) {
    console.error("❌ fetchPageText 抓取失败：", err.message);
    return "";
  }
}

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

// 主接口：/ask
app.post("/ask", async (req, res) => {
  console.log("📩 收到 /ask 请求：", req.body);

  const { url, question } = req.body;

  if (!question) {
    return res.json({ answer: "", error: "问题不能为空" });
  }
  if (!url) {
    return res.json({ answer: "", error: "缺少目标网页链接" });
  }

  const pageText = await fetchPageText(url);
  if (!pageText) {
    return res.json({
      answer: "",
      error: "无法抓取该网页，可能被网站拒绝访问或网络异常。",
    });
  }

  const prompt = `
你是一名网页信息引导助手。
以下是网页内容的一部分：
${pageText}

用户问题：${question}
请根据网页内容，给出清晰简短的中文回答。`;

  const answer = await askDeepSeek(prompt);
  return res.json({ answer, raw: pageText });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
  console.log("====== 正在等待请求 ======");
});
