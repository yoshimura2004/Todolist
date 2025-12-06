// frontend/public/sw.js

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    console.error("푸시 데이터 파싱 실패:", e)
  }

  const title = data.title || "TodoTodo"
  const subtitle = data.subtitle || ""
  const bodyLine = data.body || ""

  const options = {
    // 1줄차: 부제목 + 본문 / 2줄로 이쁘게
    body: subtitle ? `${subtitle}\n${bodyLine}` : bodyLine,
    icon: "/icons/todotodo-192.png", // 나중에 만들 아이콘, 없으면 주석처리해도 됨
    badge: "/icons/todotodo-72.png", // 선택
    data: data.data || {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const dateStr = data.dateStr  // 예: "2025-12-01"

  const baseUrl = self.location.origin + "/"
  const urlToOpen = dateStr ? `${baseUrl}?date=${dateStr}` : baseUrl

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // 이미 열려있는 탭이 있으면 그 탭에서 해당 URL로 이동 후 포커스
      for (const client of windowClients) {
        if ("navigate" in client) {
          return client.navigate(urlToOpen).then((c) => c && c.focus())
        }
      }
      // 없으면 새 탭 생성
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    }),
  )
})

