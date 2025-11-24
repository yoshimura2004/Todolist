import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'   // ✅ 추가

const app = express()
const prisma = new PrismaClient()              // ✅ Prisma 인스턴스

app.use(cors({
  origin: 'http://localhost:5173',   // Vite 기본 포트
}))
// JSON 파싱
app.use(express.json())

// 기본 라우트
app.get('/', (req, res) => {
  res.send('서버 잘 켜졌습니다!')
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
 * 🧪 1회용 API: 기본 유저 생성용
 * - POST /init-user 를 한 번만 호출해서 테스트 유저를 만든다.
 */
app.post('/init-user', async (req, res) => {
  try {
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },   // 이미 있으면 업데이트 안 하고 그대로
      update: {},
      create: {
        email: 'test@example.com',
        passwordHash: 'dummy-hash',          // 나중에 진짜 해싱으로 바꾸면 됨
        name: '테스트유저',
        role: 'USER',
      },
    })

    res.json({
      message: '기본 유저가 준비되었습니다.',
      user,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '기본 유저 생성 중 오류' })
  }
})

/**
 * ✅ DB 버전: POST /todos
 * - body: { title, description?, priority? }
 * - 로그인/인증은 아직 없으니, 일단 userId = 1 고정으로 사용
 */
app.post('/todos', async (req, res) => {
  const { title, description, priority, dueDate } = req.body ?? {}

  if (!title) {
    return res.status(400).json({ error: 'title은 필수입니다.' })
  }

  try {
    const newTodo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        priority: priority ?? 2,
        userId: 1,
        // 🔹 여기! 문자열(YYYY-MM-DD)로 왔다고 가정
        dueDate: dueDate ? new Date(`${dueDate}T09:00:00`) : null,
      },
    })

    res.status(201).json({
      message: 'DB에 Todo가 저장되었습니다.',
      todo: newTodo,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'DB 저장 중 오류 발생' })
  }
})



/**
 * ✅ DB 버전: GET /todos
 * - (임시로) userId = 1 인 Todo만 조회
 */
app.get('/todos', async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: 1 },
      orderBy: { createdAt: 'desc' },
    })

    res.json(todos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'DB 조회 중 오류 발생' })
  }
})

/**
 * ✅ DB 버전: DELETE /todos/:id
 */
app.delete('/todos/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'id는 숫자여야 합니다.' })
  }

  try {
    await prisma.todo.delete({
      where: { id },
    })

    res.json({ message: '삭제되었습니다.', id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '삭제 중 오류 발생' })
  }
})
/**
 * ✅ 상태 토글: PATCH /todos/:id/toggle
 * - 현재 status 가 OPEN 이면 DONE 으로
 * - DONE 이면 다시 OPEN 으로 되돌리기
 */
app.patch('/todos/:id/toggle', async (req, res) => {
  const id = Number(req.params.id)

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'id는 숫자여야 합니다.' })
  }

  try {
    // 1) 현재 Todo 조회
    const todo = await prisma.todo.findUnique({
      where: { id },
    })

    if (!todo) {
      return res.status(404).json({ error: '해당 Todo를 찾을 수 없습니다.' })
    }

    // 2) 새 status 계산
    const newStatus = todo.status === 'DONE' ? 'OPEN' : 'DONE'

    // 3) DB 업데이트
    const updated = await prisma.todo.update({
      where: { id },
      data: { status: newStatus },
    })

    res.json({
      message: '상태가 변경되었습니다.',
      todo: updated,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '상태 변경 중 오류 발생' })
  }
})

/**
 * ✅ Todo 수정: PATCH /todos/:id
 * - body에 들어온 값만 골라서 수정
 *   예) { title: "새 제목" }
 */
app.patch('/todos/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'id는 숫자여야 합니다.' })
  }

  // body에서 수정할 값 꺼내기
  const { title, description, priority } = req.body ?? {}

  // 최소한 title 이라도 있어야 한다고 가정 (원하면 조건 완화 가능)
  if (!title && !description && priority === undefined) {
    return res.status(400).json({
      error: '수정할 값이 없습니다. title, description 또는 priority 중 하나는 있어야 합니다.',
    })
  }

  try {
    const updated = await prisma.todo.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
      },
    })

    res.json({
      message: 'Todo가 수정되었습니다.',
      todo: updated,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '수정 중 오류 발생' })
  }
})

// ✅ 날짜별 Todo 조회: GET /todos/by-date?date=2025-11-20
app.get('/todos/by-date', async (req, res) => {
  const { date } = req.query

  if (!date) {
    return res.status(400).json({ error: 'date 쿼리 파라미터가 필요합니다. 예: /todos/by-date?date=2025-11-20' })
  }

  try {
    // date 문자열을 Date로 변환 (로컬 기준으로 단순 처리)
    const start = new Date(date)           // 2025-11-20 00:00
    const end = new Date(date)
    end.setDate(end.getDate() + 1)         // 2025-11-21 00:00

    const todos = await prisma.todo.findMany({
      where: {
        userId: 1, // TODO: 나중에 로그인 연동 시 변경
        dueDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(todos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '날짜별 Todo 조회 중 오류 발생' })
  }
})

// 🔚 서버 실행 부분 (파일 맨 아래에 위치)
const PORT = 4000

app.listen(PORT, () => {
  console.log(`📡 서버 실행됨: http://localhost:${PORT}`)
})
