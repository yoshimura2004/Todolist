import { VAPID_PUBLIC_KEY } from "./pushConfig"

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerPush() {
  if (!("serviceWorker" in navigator)) {
    alert("이 브라우저에서는 알림을 지원하지 않습니다.")
    return
  }
  if (!("PushManager" in window)) {
    alert("푸시 알림을 지원하지 않는 브라우저입니다.")
    return
  }

  const perm = await Notification.requestPermission()
  if (perm !== "granted") {
    alert("알림 권한이 거부되었습니다.")
    return
  }

  // Service Worker 등록
  const registration = await navigator.serviceWorker.register("/sw.js")

  // 구독 생성
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  // 백엔드로 전송 (userId는 일단 1으로 고정)
  await fetch("http://localhost:4000/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription,
      userId: 1,
    }),
  })

  alert("푸시 알림이 활성화되었습니다!")
}

export async function sendTestPush() {
  await fetch("http://localhost:4000/api/push/test", {
    method: "POST",
  })
}