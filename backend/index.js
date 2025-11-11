// index.js
const express = require('express');
const app = express();

// 미들웨어 (요청 본문 JSON 처리)
app.use(express.json());

// 기본 테스트 라우트
app.get('/', (req, res) => {
  res.send('✅ Backend server is running!');
});

// 서버 실행
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
