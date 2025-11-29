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
    body: subtitle ? `${subtitle}\n${bodyLine}` : bodyLine,
    icon: "/icon-192.png",   // 있으면 사용, 없으면 생략 가능
    badge: "/icon-72.png",   // 선택
    data: data.data || {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  // 추후: 특정 Todo 상세 페이지로 이동하고 싶으면 여기서 처리
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clis) => {
      if (clis.length > 0) {
        clis[0].focus()
      } else {
        clients.openWindow("/")
      }
    })
  )
})
