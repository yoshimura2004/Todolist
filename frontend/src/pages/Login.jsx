// src/pages/Login.jsx
import { useEffect, useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
import api from "../api" 
function Login({ onLogin }) {
  const [installPromptEvent, setInstallPromptEvent] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  // ✅ PWA 설치 가능/설치 여부 체크
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
      setIsInstalled(isStandalone)
    }

    checkInstalled()

    const handleBeforeInstallPrompt = (e) => {
      // 브라우저가 자동으로 뜨는 기본 배너 막기
      e.preventDefault()
      setInstallPromptEvent(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", checkInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      )
      window.removeEventListener("appinstalled", checkInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPromptEvent) return
    installPromptEvent.prompt()
    const { outcome } = await installPromptEvent.userChoice
    if (outcome === "accepted") {
      setInstallPromptEvent(null)
    }
  }

  // ✅ 구글 로그인 성공 시
const handleLoginSuccess = async (credentialResponse) => {
  try {
    const res = await api.post("/auth/google", {
      credential: credentialResponse.credential,
    })

    const data = res.data

    // ✅ 토큰은 HttpOnly 쿠키에 있고,
    //    프론트에는 유저 정보만 저장
    localStorage.setItem("todotodo_user", JSON.stringify(data.user))

    onLogin(data) // 기존 구조 유지 (data 안에 user 있음)
  } catch (err) {
    console.error("Google 로그인 실패:", err)
    alert("로그인 중 오류가 발생했습니다.")
  }
}

  const handleLoginError = () => {
    alert("Google 로그인에 실패했습니다. 다시 시도해 주세요.")
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo-dot" />
          <span className="login-logo-text">TodoAssistant</span>
        </div>

        <h1 className="login-title">당신의 하루를 정리해 줄 작은 어시스턴트</h1>
        <p className="login-subtitle">
          Google 계정 하나로 PC·모바일 어디서든
          <br />
          일정과 Todo를 한 번에 관리해 보세요.
        </p>

        <div className="login-google-box">
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            text="signin_with"
            width="280"
          />
          <p className="login-google-hint">
            회사/중요 계정이 아닌 개인 Google 계정 사용을 추천합니다.
          </p>
        </div>

        {/* ✅ PWA 홈 화면 추가 버튼 (가능할 때만 표시) */}
        {installPromptEvent && !isInstalled && (
          <button
            type="button"
            className="login-install-btn"
            onClick={handleInstallClick}
          >
            📱 홈 화면에 추가해서 앱처럼 사용하기
          </button>
        )}

        {isInstalled && (
          <p className="login-installed-text">
            이미 홈 화면에 추가되어 있습니다. 앱에서 바로 열어보세요!
          </p>
        )}
      </div>
    </div>
  )
}

export default Login
