// src/pages/Home.jsx
import { useEffect, useState } from "react"
import { todoApi } from "../api"
import TodoForm from "../components/TodoForm"
import TodoList from "../components/TodoList"
import Calendar from "../components/Calendar"
import Modal from "../components/Modal"
import { registerPush, sendTestPush, disablePush } from "../registerPush"

function Home({ auth, onLogout }) {
  const [pushStatus, setPushStatus] = useState("unknown")
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState("active")
  const [activeButton, setActiveButton] = useState(null)

  // 🔽 정렬 방향: desc = 최신 날짜 → 위 / asc = 오래된 날짜 → 위
  const [sortDirection, setSortDirection] = useState("asc")

  const toLocalDateStr = (isoString) => {
    const d = new Date(isoString)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${day}`
  }

  // 🔹 D-Day 라벨 (Home에서 쓰는 버전)
  const getDdayLabelFromIso = (isoString) => {
    if (!isoString) return null

    const today = new Date()
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const d = new Date(isoString)
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const diffDays = Math.round(
      (target - base) / (1000 * 60 * 60 * 24),
    )

    if (diffDays === 0) return "오늘"
    if (diffDays === 1) return "하루 남음"
    if (diffDays > 1) return `D-${diffDays}`
    return `D+${Math.abs(diffDays)}`
  }
  // 🔽 달력 & 모달 관련 상태
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0~11
  const [selectedDate, setSelectedDate] = useState(null)
  const [dailyTodos, setDailyTodos] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const todoDates = todos
    .filter((t) => t.dueDate && t.status !== "DONE")
    .map((t) => toLocalDateStr(t.dueDate))// "2025-11-27T09:00:00..." -> "2025-11-27"
  // ISO 문자열을 로컬 기준 YYYY-MM-DD 로 바꾸는 함수
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const upcomingMap = new Map() // key: 'YYYY-MM-DD', value: earliest todo of that day

  todos.forEach((todo) => {
    if (!todo.dueDate) return
    if (todo.status === "DONE") return

    const d = new Date(todo.dueDate)
    if (d < todayStart) return // 과거 일정은 제외

    const dateKey = toLocalDateStr(todo.dueDate)
    const prev = upcomingMap.get(dateKey)

    if (!prev || new Date(todo.dueDate) < new Date(prev.dueDate)) {
      upcomingMap.set(dateKey, todo)
    }
  })

  const upcomingList = Array.from(upcomingMap.entries())
    .sort((a, b) => new Date(a[1].dueDate) - new Date(b[1].dueDate))
    .slice(0, 5) // 상위 5일 정도만 노출 (원하면 숫자 바꿔도 됨)
    .map(([dateStr, todo]) => ({ dateStr, todo }))


  // 초기 전체 목록
  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await todoApi.getTodos()
      setTodos(data)
    } catch (err) {
      console.error(err)
      setError("Todo 목록을 불러오는 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushStatus("unsupported")
      return
    }

    const perm = Notification.permission
    const enabledFlag = localStorage.getItem("todotodo_push_enabled") === "true"

    if (perm === "granted" && enabledFlag) {
      setPushStatus("enabled")
    } else if (perm === "denied") {
      setPushStatus("blocked")
    } else {
      setPushStatus("notYet")
    }
  }, [])

  useEffect(() => {
    // URLSearchParams로 ?date=2025-12-01 같은 값 읽기
    const params = new URLSearchParams(window.location.search)
    const dateParam = params.get("date")
    if (!dateParam) return

    // 간단한 형식 체크 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return

    const [yStr, mStr] = dateParam.split("-")
    const y = Number(yStr)
    const mIndex = Number(mStr) - 1 // 0~11

    if (Number.isNaN(y) || Number.isNaN(mIndex)) return

    // 🔹 달력 연/월 이동
    setYear(y)
    setMonth(mIndex)

    // 🔹 해당 날짜 선택 + 모달/리스트 로딩
    // (handleSelectDate는 이미 async로 구현되어 있으니 그대로 써도 됨)
    handleSelectDate(dateParam)
  }, [])


  const handleTogglePush = async () => {
    // 이미 켜져 있으면 -> 끄기
    if (pushStatus === "enabled") {
      const result = await disablePush()
      if (result === "disabled") {
        setPushStatus("notYet")
      }
      return
    }

    // 아직 안 켜졌으면 -> 켜기
    const result = await registerPush()
    if (result) {
      setPushStatus(result)
    }
  }

  const handleTestPush = async () => {
    await sendTestPush()
  }
  // 🔽 날짜 기준 정렬 함수
  const sortTodos = (list, direction = "desc") => {
    const dir = direction === "asc" ? 1 : -1
    return [...list].sort((a, b) => {
      const hasDueA = !!a.dueDate
      const hasDueB = !!b.dueDate

      // 1) dueDate 있는 항목이 항상 위로 (미정 날짜는 맨 아래)
      if (hasDueA !== hasDueB) {
        return hasDueA ? -1 : 1
      }

      // 2) 둘 다 dueDate 없으면 createdAt 기준
      const dateA = new Date(a.dueDate ?? a.createdAt)
      const dateB = new Date(b.dueDate ?? b.createdAt)

      const base = dateA - dateB // 음수면 A가 더 과거
      return base * dir
    })
  }

  // 🔽 화면에 보여줄 목록 (선택된 날짜가 있으면 dailyTodos, 아니면 전체)
  // 1) 기준 리스트 (날짜 선택 여부에 따라)
  const baseList = selectedDate ? dailyTodos : todos

  // 2) 진행 / 완료로 먼저 나누고, 각각 정렬
  const activeList = sortTodos(
    baseList.filter((t) => t.status !== "DONE"),
    sortDirection,
  )

  const completedList = sortTodos(
    baseList.filter((t) => t.status === "DONE"),
    sortDirection,
  )

  // 3) 화면에 보여줄 리스트 선택
  const listToShow =
    viewMode === "completed"
      ? completedList
      : activeList

  // 🔽 "다가오는 일정" (오늘 ~ 7일 후, 완료되지 않은 것만)
  const upcomingTodos = (() => {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const filtered = todos.filter((t) => {
      if (!t.dueDate) return false
      if (t.status === "DONE") return false

      const d = new Date(t.dueDate)
      const onlyDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      return onlyDate >= start && onlyDate <= end
    })

    return sortTodos(filtered, "asc") // 다가오는 일정은 항상 오래된 순(가까운 날 → 위)
  })()

  // src/pages/Home.jsx 중 일부

  // ⬇️ 기존: const handleAddTodo = async ({ title }) => {
const handleAddTodo = async ({ title, ampm, hour, minute }) => {
  try {
    setLoading(true)
    setError(null)

    let dueDate = null

    if (selectedDate && ampm && hour != null && minute != null) {
      let h24 = Number(hour)

      // 12시간 → 24시간 변환
      if (ampm === "PM" && h24 < 12) h24 += 12
      if (ampm === "AM" && h24 === 12) h24 = 0

      const hh = String(h24).padStart(2, "0")
      const mm = String(minute).padStart(2, "0")

      // ✅ 1) 로컬(KST) 기준 Date 객체 생성
      const localDate = new Date(`${selectedDate}T${hh}:${mm}:00`)

      // ✅ 2) UTC ISO 문자열로 변환해서 서버로 보냄
      //    예: "2025-12-22T09:00:00.000Z"  (KST 18:00)
      dueDate = localDate.toISOString()
    }

    const payload = {
      title,
      description: "TodoAssistant",
      priority: 2,
      dueDate, // ISO 문자열 (UTC)
    }

    await todoApi.createTodo(payload)

    const all = await todoApi.getTodos()
    setTodos(all)

    if (selectedDate) {
      const list = await todoApi.getTodosByDate(selectedDate)
      setDailyTodos(list)
    }
  } catch (err) {
    console.error(err)
    setError("Todo 추가 중 오류가 발생했습니다.")
  } finally {
    setLoading(false)
  }
}

  const handleDeleteTodo = async (id) => {
    const ok = window.confirm("정말 삭제하시겠습니까?")
    if (!ok) return

    try {
      setLoading(true)
      setError(null)
      await todoApi.deleteTodo(id)
      setTodos((prev) => prev.filter((todo) => todo.id !== id))
      setDailyTodos((prev) => prev.filter((todo) => todo.id !== id))
    } catch (err) {
      console.error(err)
      setError("Todo 삭제 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTodo = async (id) => {
    try {
      setLoading(true)
      setError(null)

      const updated = await todoApi.toggleTodoStatus(id)

      const applyUpdate = (list) =>
        list.map((todo) => (todo.id === id ? updated : todo))

      setTodos(applyUpdate)
      setDailyTodos(applyUpdate)
    } catch (err) {
      console.error(err)
      setError("상태 변경 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTodo = async (id, payload) => {
    try {
      setLoading(true)
      setError(null)

      const updated = await todoApi.updateTodo(id, payload)

      const applyUpdate = (list) =>
        list.map((todo) => (todo.id === id ? updated : todo))

      setTodos(applyUpdate)
      setDailyTodos(applyUpdate)
    } catch (err) {
      console.error(err)
      setError("수정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 🔽 달력에서 날짜 클릭 / 다가오는 일정 클릭 시
  const handleSelectDate = async (dateStr) => {
    try {
      setViewMode("active")

      // ⬇️ 선택한 날짜 기준으로 달력의 연/월도 같이 이동
      const d = new Date(dateStr)
      if (!isNaN(d)) {
        setYear(d.getFullYear())
        setMonth(d.getMonth())   // 0~11
      }

      setSelectedDate(dateStr)
      setModalOpen(true)
      setLoading(true)
      setError(null)

      const list = await todoApi.getTodosByDate(dateStr)
      setDailyTodos(list)
    } catch (err) {
      console.error(err)
      setError("날짜별 Todo 조회 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  // 🔽 전체 Todo 보기 버튼
  const handleShowAll = async () => {
    try {
      setSelectedDate(null)
      setModalOpen(false)
      setLoading(true)
      setError(null)

      const all = await todoApi.getTodos()
      setTodos(all)
      setDailyTodos([])
    } catch (err) {
      console.error(err)
      setError("전체 Todo 조회 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 🔽 정렬 방향 토글 버튼
  const handleToggleSortDirection = () => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"))
  }

  // 다가오는 일정 섹션에서 쓸 날짜 + D-Day 포맷
  const formatUpcomingDate = (dateStr) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return d.toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
  }

  const getDdayLabelFromDate = (dateStr) => {
    if (!dateStr) return ""

    const today = new Date()
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const d = new Date(dateStr)
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const diffDays = Math.round(
      (target - base) / (1000 * 60 * 60 * 24),
    )

    if (diffDays === 0) return "오늘"
    if (diffDays === 1) return "하루 남음"
    if (diffDays > 1) return `D-${diffDays}`
    return `D+${Math.abs(diffDays)}`
  }

  const handleShowToday = async () => {
    try {
      setViewMode("active")    // 진행중 뷰로
      setModalOpen(false)
      setLoading(true)
      setError(null)

      const today = new Date()
      const y = today.getFullYear()
      const mIndex = today.getMonth() // 0~11
      const dNum = today.getDate()

      const m = String(mIndex + 1).padStart(2, "0")
      const d = String(dNum).padStart(2, "0")
      const todayStr = `${y}-${m}-${d}`

      // ✅ 달력도 오늘 연/월로 이동
      setYear(y)
      setMonth(mIndex)

      // ✅ 선택된 날짜도 오늘로
      setSelectedDate(todayStr)

      const list = await todoApi.getTodosByDate(todayStr)
      setDailyTodos(list)
    } catch (err) {
      console.error(err)
      setError("오늘 Todo 조회 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="app-root">
      <div className="app-container">
        <header className="app-header">
          <div className="app-header-text">
            <h1 className="app-title">Todo Calendar</h1>
            <p className="app-subtitle">달력을 눌러 날짜별 Todo를 관리해보세요</p>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={onLogout}
          >
            로그아웃
          </button>
        </header>

        {/* 🔽 달력 영역 */}
        <div className="calendar-wrapper">
          <div className="calendar-nav">
            <button onClick={handlePrevMonth}>◀</button>
            <span>
              {year}년 {month + 1}월
            </span>
            <button onClick={handleNextMonth}>▶</button>
          </div>

          <Calendar
            year={year}
            month={month}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            todoDates={todoDates}         // ⬅️ 이 줄 추가
          />
        </div>

        {/* 🔽 다가오는 일정 섹션 */}
        {/* 🔽 다가오는 일정 섹션 */}
        <section className="upcoming-section">
          <h3 className="upcoming-title">다가오는 일정</h3>

          {upcomingList.length === 0 ? (
            <p className="upcoming-empty">다가오는 일정이 없습니다.</p>
          ) : (
            <div className="upcoming-list">
              {upcomingList.map(({ dateStr, todo }) => {
                const d = new Date(todo.dueDate)
                const dateLabel = d.toLocaleDateString("ko-KR", {
                  month: "2-digit",
                  day: "2-digit",
                  weekday: "short",
                })
                const timeLabel = d.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                const dday = getDdayLabelFromIso(todo.dueDate)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    className="upcoming-item"
                    onClick={() => handleSelectDate(dateStr)} // ✅ 클릭 시 해당 날짜로 이동
                  >
                    <div className="upcoming-item-title">{todo.title}</div>
                    <div className="upcoming-item-meta">
                      <span>{dateLabel}</span>
                      <span className="upcoming-item-time">{timeLabel}</span>
                      {dday && (
                        <span className="upcoming-item-dday">{dday}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* 🔽 전체 / 선택된 날짜 Todo 목록 섹션 */}
        <section className="summary-section">
          <div className="summary-header">
            <h2>
              {selectedDate
                ? viewMode === "completed"
                  ? `${selectedDate} 완료한 Todo`
                  : `${selectedDate} Todo 목록`
                : viewMode === "completed"
                  ? "완료한 Todo 목록"
                  : "전체 Todo 목록"}
            </h2>

            <div className="summary-filter-group">
              {/* 1️⃣ 알림 끄기 : 한 줄 전체 */}
              <button
                type="button"
                className={
                  "summary-filter-btn filter-full" +
                  (pushStatus === "enabled" ? " active" : "")
                }
                onClick={handleTogglePush}
                disabled={pushStatus === "unsupported" || pushStatus === "blocked"}
              >
                {pushStatus === "enabled"
                  ? "알림 끄기"
                  : pushStatus === "blocked"
                    ? "알림 차단됨"
                    : "알림 켜기"}
              </button>

              {/* 2️⃣ 전체 / 오늘 : 2열 */}
              <button
                type="button"
                className={
                  "summary-filter-btn" + (activeButton === "all" ? " active" : "")
                }
                onClick={() => {
                  setActiveButton("all")
                  setViewMode("active")
                  handleShowAll()
                }}
              >
                전체 Todo 보기
              </button>

              <button
                type="button"
                className={
                  "summary-filter-btn" + (activeButton === "today" ? " active" : "")
                }
                onClick={() => {
                  setActiveButton("today")
                  setViewMode("active")
                  handleShowToday()
                }}
              >
                오늘 Todo
              </button>

              {/* 3️⃣ 완료한 Todo : 한 줄 전체 */}
              <button
                type="button"
                className={
                  "summary-filter-btn filter-full" +
                  (viewMode === "completed" ? " active" : "")
                }
                onClick={() => {
                  setActiveButton("completed")
                  setViewMode((prev) =>
                    prev === "completed" ? "active" : "completed"
                  )
                }}
              >
                완료한 Todo
              </button>

              {/* 4️⃣ 가까운 일정 순서 : 한 줄 전체 */}
              <button
                type="button"
                className="summary-filter-btn filter-full"
                onClick={handleToggleSortDirection}
              >
                {sortDirection === "asc" ? "가까운 일정 순서" : "먼 일정 순서"}
              </button>
            </div>
          </div>

          {loading && <p className="status-text">⏳ 처리 중...</p>}
          {error && <p className="status-text error">{error}</p>}

          <TodoList
            todos={listToShow}
            onDelete={handleDeleteTodo}
            onToggle={handleToggleTodo}
            onUpdate={handleUpdateTodo}
          />
        </section>

        {/* 🔽 날짜별 Todo 모달 */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={selectedDate ? `${selectedDate} 할 일` : "할 일"}
        >
          <TodoForm onAdd={handleAddTodo} />

          <TodoList
            todos={listToShow}
            onDelete={handleDeleteTodo}
            onToggle={handleToggleTodo}
            onUpdate={handleUpdateTodo}
          />
        </Modal>
      </div>
    </div>
  )

}

export default Home
