// src/App.jsx
import { useState, useEffect } from "react"
import Login from "./pages/Login"
import Home from "./pages/Home"
import api from "./api" 
function App() {
  const [auth, setAuth] = useState(null)

  useEffect(() => {
    const userStr = localStorage.getItem("todotodo_user")
    if (userStr) {
      // 토큰은 이제 쿠키에 있으니 user만 복구
      setAuth({ user: JSON.parse(userStr) })
    }
  }, [])

  // ✅ 로그인 성공 시 (Login.jsx에서 넘어오는 값: { user })
  const handleLogin = (data) => {
    // data = { user }
    setAuth({ user: data.user })
  }

  // ✅ 로그아웃: 서버 쿠키 지우기 + 클라이언트 상태 초기화
const handleLogout = async () => {
  try {
    await api.post("/auth/logout")
  } catch (err) {
    console.error("logout error:", err)
  } finally {
    localStorage.removeItem("todotodo_user")
    localStorage.removeItem("todotodo_token")  // 👈 추가
    setAuth(null)
  }
}

  // 로그인 안 되었으면 Login 화면
  if (!auth) {
    return <Login onLogin={handleLogin} />
  }

  // 로그인 되면 Home 화면
  return <Home auth={auth} onLogout={handleLogout} />
}

export default App
