import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'   // ✅ 추가
import cron from "node-cron"
import webpush from "web-push"
import { checkAndSendTodoNotifications } from "./notificationScheduler.mjs"

const app = express()
const prisma = new PrismaClient()              // ✅ Prisma 인스턴스

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

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
        // ⬇️ "2025-11-27T21:30:00" 같은 문자열을 그대로 Date로 변환
        dueDate: dueDate ? new Date(dueDate) : null,
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

// 🔔 푸시 구독 저장
app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { subscription, userId } = req.body

    console.log("📝 새 푸시 구독 요청:", subscription?.endpoint)

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "subscription 정보가 없습니다." })
    }

    const uid = Number(userId) || 1
    const { endpoint, keys } = subscription

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: uid,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    })

    console.log("✅ 구독 저장 완료:", endpoint)

    res.json({ ok: true })
  } catch (err) {
    console.error("push subscribe 오류:", err)
    res.status(500).json({ error: "구독 저장 중 오류" })
  }
})
// 🔔 테스트용 푸시 알림 API
app.post("/api/push/test", async (req, res) => {
  try {
    const uid = 1  // 일단 1번 유저 기준

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: uid },
    })

    console.log(`🧪 테스트 푸시 - 구독 수: ${subs.length}`)

    if (subs.length === 0) {
      return res.status(400).json({ error: "저장된 구독이 없습니다." })
    }

    const payload = JSON.stringify({
      title: "TodoTodo",
      subtitle: "테스트 알람",
      body: "이 알림이 보이면 Push 설정 성공입니다! 🎉",
      data: {},
    })

    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      await webpush.sendNotification(pushSub, payload)
      console.log("✅ 테스트 푸시 발송 완료")
    }

    res.json({ ok: true })
  } catch (err) {
    console.error("❌ 테스트 푸시 실패:", err.statusCode || err)
    res.status(500).json({ error: "테스트 푸시 실패" })
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

  const { title, description, priority, dueDate } = req.body ?? {}

  if (
    !title &&
    !description &&
    priority === undefined &&
    dueDate === undefined
  ) {
    return res.status(400).json({
      error:
        '수정할 값이 없습니다. title, description, priority, dueDate 중 하나는 있어야 합니다.',
    })
  }

  try {
    const updated = await prisma.todo.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
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
  const { date } = req.query // 'YYYY-MM-DD'
  if (!date) {
    return res.status(400).json({ error: 'date 쿼리스트링이 필요합니다.' })
  }

  try {
    const [year, month, day] = date.split('-').map(Number)

    // 로컬 기준: 해당 날짜 00:00 ~ 다음날 00:00 전까지
    const start = new Date(year, month - 1, day, 0, 0, 0)
    const end = new Date(year, month - 1, day + 1, 0, 0, 0)

    const todos = await prisma.todo.findMany({
      where: {
        userId: 1,
        dueDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    res.json(todos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '날짜별 Todo 조회 중 오류' })
  }
})


// 🔚 서버 실행 부분 (파일 맨 아래에 위치)
const PORT = 4000

app.listen(PORT, () => {
  console.log(`📡 서버 실행됨: http://localhost:${PORT}`)
})

// 🔽 테스트용: 1분마다 알림 체크
cron.schedule("*/1 * * * *", () => {
  console.log("⏰ [CRON] Todo 알림 체크 시작")
  checkAndSendTodoNotifications().catch((err) => {
    console.error("알림 체크 중 오류:", err)
  })
})