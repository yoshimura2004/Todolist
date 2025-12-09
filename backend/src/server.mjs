import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'   // ✅ 추가
import cron from "node-cron"
import webpush from "web-push"
import { checkAndSendTodoNotifications } from "./notificationScheduler.mjs"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import dotenv from "dotenv";
import cookieParser from "cookie-parser"

dotenv.config()

const app = express()
const prisma = new PrismaClient()              // ✅ Prisma 인스턴스
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // ✅ 토큰에 { id, email, name } 으로 들어 있으므로 이렇게 수정!
    req.user = {
      userId: decoded.id,
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
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true,                    // 🔥 쿠키 허용
}))

app.use(cookieParser())                 // 🔥 쿠키 파싱
app.use(express.json())

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
        // 비밀번호 로그인은 안 쓸 거라 의미 없는 값 넣어두기
        passwordHash: "GOOGLE_USER",
        role: "USER",
      },
    })

    // 3) 우리 서비스용 JWT 발급 (User.id 사용!)
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
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
      token,   // 👈 프론트가 localStorage에 저장해서 쓸 수 있게 추가
    })

  } catch (err) {
    console.error("Google auth error:", err)
    res.status(401).json({ message: "Google 로그인 실패" })
  }
})
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
 * ✅ DB 버전: POST /todos
 * - body: { title, description?, priority? }
 * - 로그인/인증은 아직 없으니, 일단 userId = 1 고정으로 사용
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
        userId: req.user.userId,               // 🔥 여기!
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })

    res.status(201).json(newTodo)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "DB 저장 중 오류 발생" })
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
// app.post("/api/push/test", async (req, res) => {
//   try {
//     const uid = 1

//     const subs = await prisma.pushSubscription.findMany({
//       where: { userId: uid },
//     })

//     console.log(`🧪 테스트 푸시 - 구독 수: ${subs.length}`)

//     if (subs.length === 0) {
//       return res.status(400).json({ error: "저장된 구독이 없습니다." })
//     }

//     const payload = JSON.stringify({
//       title: "TodoTodo",
//       subtitle: "테스트 알람",
//       body: "이 알림이 보이면 Push 설정 성공입니다! 🎉",
//       data: {},
//     })

//     for (const sub of subs) {
//       const pushSub = {
//         endpoint: sub.endpoint,
//         keys: {
//           p256dh: sub.p256dh,
//           auth: sub.auth,
//         },
//       }

//       try {
//         await webpush.sendNotification(pushSub, payload)
//         console.log("✅ 테스트 푸시 발송 완료")
//       } catch (err) {
//         const code = err?.statusCode || err?.status || "unknown"
//         console.error("❌ 테스트 푸시 실패:", code)

//         // 🔥 410 / 404 => 이 구독은 더 이상 유효하지 않으니 DB에서 삭제
//         if (code === 410 || code === 404) {
//           console.log("🗑️ 만료된 구독 삭제:", sub.endpoint)
//           await prisma.pushSubscription.delete({
//             where: { endpoint: sub.endpoint },
//           })
//         }
//       }
//     }

//     res.json({ ok: true })
//   } catch (err) {
//     console.error("❌ 테스트 푸시 실패 (전체):", err)
//     res.status(500).json({ error: "테스트 푸시 실패" })
//   }
// })



/**
 * ✅ DB 버전: GET /todos
 * - (임시로) userId = 1 인 Todo만 조회
 */
app.get("/api/todos", authMiddleware, async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      where: { userId: req.user.userId },      // 🔥 로그인한 유저만
      orderBy: { createdAt: "desc" },
    })

    res.json(todos)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "DB 조회 중 오류 발생" })
  }
})

// Todo 삭제: DELETE /api/todos/:id
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
    console.error(error)
    res.status(500).json({ error: "삭제 중 오류 발생" })
  }
})

// 상태 토글: PATCH /api/todos/:id/toggle

app.patch("/api/todos/:id/toggle", authMiddleware, async (req, res) => {
  const id = Number(req.params.id)

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "id는 숫자여야 합니다." })
  }

  try {
    // 내 Todo인지 확인
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
    console.error(error)
    res.status(500).json({ error: "상태 변경 중 오류 발생" })
  }
})

/**
 * ✅ Todo 수정: PATCH /todos/:id
 * - body에 들어온 값만 골라서 수정
 *   예) { title: "새 제목" }
 */
// Todo 수정: PATCH /api/todos/:id
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
    console.error(error)
    res.status(500).json({ error: "수정 중 오류 발생" })
  }
})


// 날짜별 Todo: GET /api/todos/by-date?date=YYYY-MM-DD
app.get("/api/todos/by-date", authMiddleware, async (req, res) => {
  const { date } = req.query // 'YYYY-MM-DD'
  if (!date) {
    return res.status(400).json({ error: "date 쿼리스트링이 필요합니다." })
  }

  try {
    const [year, month, day] = date.split("-").map(Number)

    // 로컬 기준: 해당 날짜 00:00 ~ 다음날 00:00 전까지
    const start = new Date(year, month - 1, day, 0, 0, 0)
    const end = new Date(year, month - 1, day + 1, 0, 0, 0)

    const todos = await prisma.todo.findMany({
      where: {
        userId: req.user.userId,               // 🔥 로그인 유저
        dueDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { dueDate: "asc" },
    })

    res.json(todos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "날짜별 Todo 조회 중 오류" })
  }
})


// 🔚 서버 실행 부분 (파일 맨 아래에 위치)
const PORT = process.env.PORT || 4000   // 🔥 배포환경은 Render가 PORT를 넣어줌


app.listen(PORT, () => {
  console.log(`📡 서버 실행됨: http://localhost:${PORT}`)
})

// 매일 오전 9시
cron.schedule("0 9 * * *", () => {
  console.log("⏰ [CRON] Todo 알림 체크 시작 (매일 09:00)")
  checkAndSendTodoNotifications().catch((err) =>
    console.error("알림 체크 중 오류:", err),
  )
})