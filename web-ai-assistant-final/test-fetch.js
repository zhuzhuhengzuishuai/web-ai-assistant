const axios = require("axios");

axios.get("https://example.com")
  .then(res => {
    console.log("OK! 网页抓取成功。长度:", res.data.length);
  })
  .catch(err => {
    console.error("抓取失败:", err.message);
  });