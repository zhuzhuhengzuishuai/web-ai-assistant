<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>网页信息引导助手 Demo</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      padding: 0;
      display: flex;
      height: 100vh;
      box-sizing: border-box;
    }
    .left, .right {
      padding: 12px;
      box-sizing: border-box;
    }
    .left {
      width: 50%;
      border-right: 1px solid #ddd;
      display: flex;
      flex-direction: column;
    }
    .right {
      width: 50%;
      display: flex;
      flex-direction: column;
    }
    #siteFrame {
      flex: 1;
      width: 100%;
      border: 1px solid #ccc;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
    }
    #answerBox {
      white-space: pre-wrap;
      border: 1px solid #ccc;
      padding: 8px;
      min-height: 80px;
      margin-top: 8px;
    }
    #historyBox {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 8px;
      margin-top: 8px;
    }
    #rawText {
      height: 120px;
      margin-top: 8px;
      font-size: 12px;
      white-space: pre-wrap;
    }
    button {
      margin-left: 4px;
    }
  </style>
</head>
<body>
  <div class="left">
    <div>
      <input
        id="urlInput"
        type="text"
        style="width: 70%;"
        placeholder="请输入要分析的网页链接，例如：https://www.jd.com"
      />
      <button onclick="loadPage()">加载网页</button>
      <!-- 这里可以放几个快捷按钮 -->
      <button onclick="quickUrl('https://www.jd.com')">京东首页</button>
    </div>
    <iframe id="siteFrame"></iframe>
  </div>

  <div class="right">
    <div>
      <textarea
        id="questionInput"
        rows="3"
        placeholder="在这里输入你想问 AI 的问题，比如：我应该去哪里查账户余额？"
      ></textarea>
      <br />
      <button onclick="ask()">发送问题</button>
    </div>

    <div id="answerBox">请先在左侧输入并加载一个网页链接。</div>
    <div id="historyBox"></div>

    <textarea id="rawText" readonly placeholder="这里显示抓取到的原始网页文本（截断后的）"></textarea>
  </div>

  <script>
    let currentUrl = "";

    function loadPage() {
      const url = document.getElementById("urlInput").value.trim();
      const frame = document.getElementById("siteFrame");
      if (!url) return;
      currentUrl = url;
      frame.src = url;
      document.getElementById("answerBox").textContent =
        "已加载网页：" +
        url +
        "\n现在可以在右侧提问，比如“我需要去哪里查询账户余额？”";
      document.getElementById("historyBox").innerHTML = "";
      document.getElementById("rawText").value = "";
    }

    function quickUrl(u) {
      document.getElementById("urlInput").value = u;
      loadPage();
    }

    async function ask() {
      const question = document.getElementById("questionInput").value.trim();
      const answerBox = document.getElementById("answerBox");
      const historyBox = document.getElementById("historyBox");
      const rawBox = document.getElementById("rawText");

      if (!currentUrl) {
        answerBox.textContent = "请先在上方输入并加载目标网页链接。";
        return;
      }
      if (!question) {
        answerBox.textContent = "请输入要询问的问题。";
        return;
      }

      answerBox.textContent = "正在读取网页并向大模型提问，请稍等……";

      try {
        const res = await fetch("/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: currentUrl, question }),
        });

        const data = await res.json();

        if (data.answer) {
          historyBox.innerHTML += `<p><b>我：</b>${question}</p>`;
          historyBox.innerHTML += `<p><b>AI：</b>${data.answer.replace(
            /\n/g,
            "<br>"
          )}</p><hr>`;

          answerBox.textContent = data.answer;
          if (data.raw) {
            rawBox.value = data.raw;
          }
        } else {
          answerBox.textContent = data.error || "后端没有返回答案。";
        }
      } catch (e) {
        console.error(e);
        answerBox.textContent =
          "请求失败，请确认云端服务器正在运行，并稍后重试。";
      }
    }

    window.onload = function () {
      // 初始不自动加载，用户自己输入链接
    };
  </script>
</body>
</html>
