// backend/src/notificationScheduler.mjs
import { PrismaClient } from "@prisma/client"
import webpush from "web-push"

const prisma = new PrismaClient()

// 혹시 server.mjs에서 이미 setVapidDetails를 했다면, 아래는 중복이지만 문제 없음
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// 🔹 날짜 차이 (일 단위)
function diffInDays(fromDate, toDate) {
  const from = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  )
  const to = new Date(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate()
  )
  const diffMs = to - from
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// 🔹 한 Todo에 대해, 해당 유저의 모든 구독으로 푸시 발송
async function sendPushForTodo(todo, dLabel) {
  const d = todo.dueDate ? new Date(todo.dueDate) : null

  let dateText = ""
  let dateStr = null

  if (d) {
    const dateLabel = d.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    })
    const timeLabel = d.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })
    dateText = `${dateLabel} · ${timeLabel}`

    // 🔹 YYYY-MM-DD 형식 (달력 이동용)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    dateStr = `${y}-${m}-${day}`
  }

  const payload = {
    title: "TodoTodo",
    subtitle: `⏰ ${dLabel}`,
    body: `${dateText}\n${todo.title}`,
    data: {
      todoId: todo.id,
      dateStr,            // ⬅️ 여기 추가!
    },
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: todo.userId },
  })

  console.log(`🔔 발송 대상 구독 수: ${subs.length}`)

  const payloadString = JSON.stringify(payload)

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    }

    try {
      await webpush.sendNotification(pushSub, payloadString)
      console.log("✅ 푸시 발송 완료:", todo.title, dLabel)
    } catch (err) {
      console.error("❌ 푸시 발송 실패:", err?.statusCode || err)
      // 410/404 정리 로직 있으시면 그대로 두고 사용
    }
  }
}

// 🔹 D-7 / D-3 / D-1 체크 + 플래그 업데이트
export async function checkAndSendTodoNotifications() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const todos = await prisma.todo.findMany({
    where: {
      status: { not: "DONE" },
      dueDate: { not: null },
    },
  })

  console.log("알림 체크 - 대상 Todo 개수:", todos.length)

  // 🔹 userId + 날짜 + D라벨 기준으로 하루 1건만 보내기 위한 그룹 Map
  const grouped = new Map()

  for (const todo of todos) {
    const due = new Date(todo.dueDate)
    const targetDate = new Date(due.getFullYear(), due.getMonth(), due.getDate())

    const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24))

    // D-7 / D-3 / D-1 판별 + Todo가 이미 보낸 적 있는지 체크
    let dLabel = null
    if (diffDays === 7 && !todo.notifyD7Sent) dLabel = "D-7"
    else if (diffDays === 3 && !todo.notifyD3Sent) dLabel = "D-3"
    else if (diffDays === 1 && !todo.notifyD1Sent) dLabel = "D-1"
    else continue

    // YYYY-MM-DD 형식 문자열
    const y = targetDate.getFullYear()
    const m = String(targetDate.getMonth() + 1).padStart(2, "0")
    const d = String(targetDate.getDate()).padStart(2, "0")
    const dateStr = `${y}-${m}-${d}`

    // 🔑 하루 1건 기준 Key
    const key = `${todo.userId}-${dateStr}-${dLabel}`

    const prev = grouped.get(key)

    // 🔍 같은 날에 여러 Todo가 있으면, "가장 빠른 시간"인 놈 저장
    if (!prev || new Date(todo.dueDate) < new Date(prev.todo.dueDate)) {
      grouped.set(key, { todo, dLabel })
    }
  }

  console.log("알림 발송할 그룹 수:", grouped.size);

  // 🔔 실제 발송
  for (const { todo, dLabel } of grouped.values()) {
    await sendPushForTodo(todo, `${dLabel} 알람`)

    // 알림 플래그 업데이트
    const updateData =
      dLabel === "D-7"
        ? { notifyD7Sent: true }
        : dLabel === "D-3"
        ? { notifyD3Sent: true }
        : { notifyD1Sent: true }

    await prisma.todo.update({
      where: { id: todo.id },
      data: updateData,
    })
  }
}
