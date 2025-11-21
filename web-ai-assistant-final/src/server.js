// server.js —— 永不退出加强版（DeepSeek + 网页抓取）

console.log("===== SERVER.JS START =====");

// 捕获所有异常，防止服务器退出
process.on("uncaughtException", (err) => {
    console.error("🔥 uncaughtException 捕获到错误：", err);
});
process.on("unhandledRejection", (reason) => {
    console.error("🔥 unhandledRejection 捕获到错误：", reason);
});
process.on("exit", (code) => {
    console.log("⚠️ 进程即将退出，exit code =", code);
});

const path = require("path");
console.log("当前运行文件路径:", __filename);

require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 5002;
  // ⭐ 使用 5002（稳定无冲突）

console.log("Node 版本：", process.version);
console.log("是否读取 DEEPSEEK_API_KEY:", !!process.env.DEEPSEEK_API_KEY);

app.use(express.json());

// 提供 index.html（确保 index.html 与 server.js 在同一目录）
app.use(express.static(__dirname));

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
    console.log(`服务器已启动：http://localhost:${PORT}`);
    console.log("====== 正在等待请求 ======");
});

// 监听端口错误 (例如端口占用)
server.on("error", (err) => {
    console.error("💥 监听端口时出错（server error）：", err);
});

// 心跳日志（确保进程活着）
setInterval(() => {
    console.log("⏱ 心跳：进程仍在运行");
}, 5000);

