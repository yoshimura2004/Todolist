// frontend/src/registerPush.js
import { VAPID_PUBLIC_KEY } from "./pushConfig"
import api from "./api"

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
    return "unsupported"
  }

  const perm = await Notification.requestPermission()
  if (perm !== "granted") {
    if (perm === "denied") {
      return "blocked"
    }
    return "notYet"
  }

  const registration = await navigator.serviceWorker.register("/sw.js")

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  // 📡 서버 저장 (느릴 수 있지만, 여기서 에러만 잡고 UI는 별도로 처리)
  try {
    await api.post("/push/subscribe", {
      subscription,
      userId,
    })
  } catch (err) {
    console.error("푸시 구독 저장 실패:", err)
    // 필요하면 여기서 "serverError" 같은 상태를 추가로 리턴해도 됨
  }

  localStorage.setItem("todotodo_push_enabled", "true")
  return "enabled"
}

export async function sendTestPush() {
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
