import express from "express"
import cors from "cors"
import { PrismaClient } from "@prisma/client"
import cron from "node-cron"
import webpush from "web-push"
import { checkAndSendTodoNotifications } from "./notificationScheduler.mjs"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"

dotenv.config()

const app = express()
const prisma = new PrismaClient()
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// ✅ 하나의 상수로 통일
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

// 🔔 WebPush 설정
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// 🔐 로그인 확인 미들웨어
export function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.todotodo_token

    if (!token) {
      return res.status(401).json({ message: "로그인이 필요합니다." })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    // ✅ 옛날 토큰(userId) / 새 토큰(id) 모두 지원
    const userId = decoded.id ?? decoded.userId

    if (!userId) {
      console.error("❌ JWT payload에 id / userId가 없습니다:", decoded)
      return res
        .status(401)
        .json({ message: "잘못된 로그인 정보입니다. 다시 로그인해 주세요." })
    }

    req.user = {
      userId,
      email: decoded.email,
      name: decoded.name,
    }

    next()
  } catch (err) {
    console.error("authMiddleware JWT error:", err)
    return res
      .status(401)
      .json({ message: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요." })
  }
}

// CORS & 기본 미들웨어
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true, // 쿠키 허용
  })
)

app.use(cookieParser())
app.use(express.json())

// ✅ Health check (선택)
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || "development" })
})

/**
 * ✅ Google 로그인
 */
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body
    if (!credential) {
      return res.status(400).json({ message: "credential 누락" })
    }

    // 1) Google ID 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()

    const googleEmail = payload.email
    const googleName = payload.name || "사용자"

    if (!googleEmail) {
      return res.status(400).json({ message: "이메일 정보가 없습니다." })
    }

    // 2) User 테이블에서 email 기준으로 찾거나 없으면 생성
    const user = await prisma.user.upsert({
      where: { email: googleEmail },
      update: {
        name: googleName,
      },
      create: {
        email: googleEmail,
        name: googleName,
        passwordHash: "GOOGLE_USER", // 비밀번호 로그인 미사용
        role: "USER",
      },
    })

    // 3) 우리 서비스용 JWT 발급
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    const isProd = process.env.NODE_ENV === "production"

    res
      .cookie("todotodo_token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token, // 프론트에서 localStorage에 저장해서 사용 가능
      })
  } catch (err) {
    console.error("Google auth error:", err)
    res.status(401).json({ message: "Google 로그인 실패" })
  }
})

/**
 * ✅ 로그아웃
 */
app.post("/api/auth/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production"

  res
    .clearCookie("todotodo_token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    })
    .json({ ok: true })
})

/**
 * ✅ Todo 생성: POST /api/todos
 * body: { title, description?, priority?, dueDate? }
 * - 로그인 유저 기준으로 생성
 */
app.post("/api/todos", authMiddleware, async (req, res) => {
  const { title, description, priority, dueDate } = req.body ?? {}

  if (!title) {
    return res.status(400).json({ error: "title은 필수입니다." })
  }

  try {
    const newTodo = await prisma.todo.create({
      data: {
        title,
        description: description || null,
        priority: priority ?? 2,
        userId: req.user.userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })

    res.status(201).json(newTodo)
  } catch (error) {
    console.error("POST /api/todos error:", error)
    res.status(500).json({ error: "DB 저장 중 오류 발생" })
  }
})

/**
 * ✅ 푸시 구독 저장: POST /api/push/subscribe
 * body: { subscription }
 * - 🔐 userId는 클라이언트에서 받지 않고, 토큰에서 가져옴
 */
app.post("/api/push/subscribe", authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body

    console.log("📝 새 푸시 구독 요청:", subscription?.endpoint)

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: "subscription 정보가 없습니다." })
    }

    const uid = req.user.userId
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

/**
 * ✅ Todo 목록: GET /api/todos
 * - 로그인한 유저의 Todo만 조회
 */
app.get("/api/todos", authMiddleware, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" },
    })

    res.json(todos)
  } catch (error) {
    console.error("GET /api/todos error:", error)
    res.status(500).json({ error: "DB 조회 중 오류 발생" })
  }
})

/**
 * ✅ Todo 삭제: DELETE /api/todos/:id
 */
app.delete("/api/todos/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id)

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id는 숫자여야 합니다." })
  }

  try {
    // 내 Todo인지 확인
    const existing = await prisma.todo.findFirst({
      where: { id, userId: req.user.userId },
    })
    if (!existing) {
      return res.status(404).json({ error: "해당 Todo를 찾을 수 없습니다." })
    }

    await prisma.todo.delete({ where: { id } })

    res.json({ message: "삭제되었습니다.", id })
  } catch (error) {
    console.error("DELETE /api/todos/:id error:", error)
    res.status(500).json({ error: "삭제 중 오류 발생" })
  }
})

/**
 * ✅ 상태 토글: PATCH /api/todos/:id/toggle
 */
app.patch("/api/todos/:id/toggle", authMiddleware, async (req, res) => {
  const id = Number(req.params.id)

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id는 숫자여야 합니다." })
  }

  try {
    const todo = await prisma.todo.findFirst({
      where: { id, userId: req.user.userId },
    })

    if (!todo) {
      return res.status(404).json({ error: "해당 Todo를 찾을 수 없습니다." })
    }

    const newStatus = todo.status === "DONE" ? "OPEN" : "DONE"

    const updated = await prisma.todo.update({
      where: { id },
      data: { status: newStatus },
    })

    res.json(updated)
  } catch (error) {
    console.error("PATCH /api/todos/:id/toggle error:", error)
    res.status(500).json({ error: "상태 변경 중 오류 발생" })
  }
})

/**
 * ✅ Todo 수정: PUT /api/todos/:id
 * body: { title?, description?, priority?, dueDate? }
 */
app.put("/api/todos/:id", authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id는 숫자여야 합니다." })
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
        "수정할 값이 없습니다. title, description, priority, dueDate 중 하나는 있어야 합니다.",
    })
  }

  try {
    const existing = await prisma.todo.findFirst({
      where: { id, userId: req.user.userId },
    })
    if (!existing) {
      return res.status(404).json({ error: "해당 Todo를 찾을 수 없습니다." })
    }

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

    res.json(updated)
  } catch (error) {
    console.error("PUT /api/todos/:id error:", error)
    res.status(500).json({ error: "수정 중 오류 발생" })
  }
})

/**
 * ✅ 날짜별 Todo 조회: GET /api/todos/by-date?date=YYYY-MM-DD
 */
app.get("/api/todos/by-date", authMiddleware, async (req, res) => {
  const { date } = req.query // 'YYYY-MM-DD'
  if (!date) {
    return res.status(400).json({ error: "date 쿼리스트링이 필요합니다." })
  }

  try {
    const [year, month, day] = String(date).split("-").map(Number)

    const start = new Date(year, month - 1, day, 0, 0, 0)
    const end = new Date(year, month - 1, day + 1, 0, 0, 0)

    const todos = await prisma.todo.findMany({
      where: {
        userId: req.user.userId,
        dueDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { dueDate: "asc" },
    })

    res.json(todos)
  } catch (err) {
    console.error("GET /api/todos/by-date error:", err)
    res.status(500).json({ error: "날짜별 Todo 조회 중 오류" })
  }
})

// (선택) 404 핸들러
app.use((req, res) => {
  res.status(404).json({ error: "존재하지 않는 API입니다." })
})

// 🔚 서버 실행
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`📡 서버 실행됨: http://localhost:${PORT}`)
})

// ⏰ 매일 오전 9시 Todo 알림 체크
cron.schedule(
  "0 9 * * *",
  () => {
    console.log("⏰ [CRON] Todo 알림 체크 시작 (매일 09:00)")
    checkAndSendTodoNotifications().catch((err) =>
      console.error("알림 체크 중 오류:", err)
    )
  },
  {
    timezone: "Asia/Seoul", // ✅ 한국 시간 기준
  }
)
