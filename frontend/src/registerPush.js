// frontend/src/registerPush.js
import { VAPID_PUBLIC_KEY } from "./pushConfig"
import api from "./api"   // 👈 axios 인스턴스 불러오기

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

export async function registerPush(userId) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    alert("이 브라우저에서는 알림을 지원하지 않습니다.")
    return "unsupported"
  }

  const perm = await Notification.requestPermission()
  if (perm !== "granted") {
    if (perm === "denied") {
      alert("알림이 브라우저에서 차단되어 있습니다.\n브라우저 설정에서 권한을 변경해야 합니다.")
      return "blocked"
    }
    return "notYet"
  }

  const registration = await navigator.serviceWorker.register("/sw.js")

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  // 🔥🔥 이제 localhost 사용 금지! axios(api.js)로 전송
  await api.post("/push/subscribe", {
    subscription,
    userId,
  })

  localStorage.setItem("todotodo_push_enabled", "true")
  alert("푸시 알림이 활성화되었습니다!")
  return "enabled"
}

export async function sendTestPush() {
  // 🔥 axios로 변경
  await api.post("/push/test")
}

export async function disablePush() {
  if (!("serviceWorker" in navigator)) {
    return "unsupported"
  }

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    localStorage.removeItem("todotodo_push_enabled")
    return "disabled"
  }

  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }

  localStorage.removeItem("todotodo_push_enabled")
  return "disabled"
}
