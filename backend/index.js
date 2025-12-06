const express = require('express');
const app = express();

app.use(express.json()); // JSON 바디 파싱

// 샘플 GET
app.get('/api/hello', (req, res) => {
  res.json({ msg: 'Hello from backend 👋' });
});

// 샘플 POST (todo 추가 에코)
app.post("/api/todos", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId
    const { title, description, priority, dueDate } = req.body

    if (!title) {
      return res.status(400).json({ message: "title은 필수입니다." })
    }

    const todo = await prisma.todo.create({
      data: {
        title,
        description: description ?? null,
        priority: priority ?? 2,
        dueDate: dueDate ? new Date(dueDate) : null,
        userId, // 🔥 로그인한 사용자로 묶기
      },
    })

    res.status(201).json(todo)
  } catch (err) {
    console.error("create todo error:", err)
    res.status(500).json({ message: "Todo 생성 실패" })
  }
})

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend on http://localhost:${PORT}`);
});
