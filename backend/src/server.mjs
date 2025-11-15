import express from 'express'
let todos = []
const app = express()

// JSON 파싱
app.use(express.json())

// 기본 라우트
app.get('/', (req, res) => {
  res.send('서버 잘 켜졌습니다!')
})

/**
 * 1) /hello
 * - 간단한 텍스트를 반환하는 API
 */
app.get('/hello', (req, res) => {
  res.send('Hello, 경식님! 👋')
})

/**
 * 2) /time
 * - 현재 시간을 JSON 형태로 반환
 */
app.get('/time', (req, res) => {
  const now = new Date()
  res.json({
    message: '현재 서버 시간입니다.',
    now: now.toISOString(),   // 2025-11-15T...
  })
})

/**
 * 3) /sum
 * - 예: /sum?a=3&b=5
 * - a와 b를 더한 값을 JSON으로 반환
 */
app.get('/sum', (req, res) => {
  const a = Number(req.query.a)  // 쿼리스트링에서 a 꺼내기
  const b = Number(req.query.b)  // 쿼리스트링에서 b 꺼내기

  // 숫자가 아니면 에러 메시지
  if (Number.isNaN(a) || Number.isNaN(b)) {
    return res.status(400).json({
      error: 'a와 b 쿼리스트링에 숫자를 넣어주세요. 예: /sum?a=3&b=5',
    })
  }

  const result = a + b

  res.json({
    a,
    b,
    result,
  })
})

/**
 * 4) POST /echo
 * - 클라이언트가 보낸 데이터를 그대로 응답으로 돌려준다.
 * - POST 요청의 핵심: req.body 로 데이터 꺼내기
 */
app.post('/echo', (req, res) => {
  const data = req.body   // POST로 들어온 JSON 데이터

  res.json({
    message: '서버가 받은 데이터입니다.',
    received: data,
  })
})

/**
 * 5) POST /todos
 * - 새로운 Todo 항목을 서버 메모리에 저장한다.
 * - body: { title: "할 일 내용" }
 */
app.post('/todos', (req, res) => {
  const { title } = req.body

  if (!title) {
    return res.status(400).json({ error: 'title은 필수입니다.' })
  }

  const newTodo = {
    id: Date.now(),   // 임시 id (DB에서 자동 생성되는 것과 유사)
    title,
    isDone: false,
  }

  todos.push(newTodo)

  res.status(201).json({
    message: '새 Todo가 추가되었습니다.',
    todo: newTodo,
  })
})
/**
 * 6) GET /todos
 * - 서버에 저장된 Todo 목록을 모두 보여준다.
 */
app.get('/todos', (req, res) => {
  res.json(todos)
})
/**
 * 7) DELETE /todos/:id
 * - id에 해당하는 Todo 삭제
 */
app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id)

  todos = todos.filter(todo => todo.id !== id)

  res.json({ message: '삭제되었습니다.', id })
})

// 서버 실행
app.listen(4000, () => {
  console.log('📡 서버 실행됨: http://localhost:4000')
})
