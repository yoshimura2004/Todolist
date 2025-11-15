const express = require('express');
const app = express();

app.use(express.json()); // JSON 바디 파싱

// 샘플 GET
app.get('/api/hello', (req, res) => {
  res.json({ msg: 'Hello from backend 👋' });
});

// 샘플 POST (todo 추가 에코)
app.post('/api/todos', (req, res) => {
  const { title } = req.body;
  // 실제 DB 대신 에코
  res.status(201).json({ id: Date.now(), title });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend on http://localhost:${PORT}`);
});
