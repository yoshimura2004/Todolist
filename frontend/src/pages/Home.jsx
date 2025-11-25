// src/pages/Home.jsx
import { useEffect, useState } from "react"
import { todoApi } from "../api"
import TodoForm from "../components/TodoForm"
import TodoList from "../components/TodoList"
import Calendar from "../components/Calendar"
import Modal from "../components/Modal"

function Home() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 🔽 정렬 방향: desc = 최신 날짜 → 위 / asc = 오래된 날짜 → 위
  const [sortDirection, setSortDirection] = useState("desc")

  const toLocalDateStr = (isoString) => {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
  // 🔽 달력 & 모달 관련 상태
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0~11
  const [selectedDate, setSelectedDate] = useState(null)
  const [dailyTodos, setDailyTodos] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
const todoDates = todos
  .filter((t) => t.dueDate)
  .map((t) => toLocalDateStr(t.dueDate)) // "2025-11-27T09:00:00..." -> "2025-11-27"
  // ISO 문자열을 로컬 기준 YYYY-MM-DD 로 바꾸는 함수



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
  const listToShow = selectedDate
    ? sortTodos(dailyTodos, sortDirection)
    : sortTodos(todos, sortDirection)

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

    // 🔹 날짜 + 시간 합쳐서 ISO 문자열 만들기
    let dueDate = selectedDate ?? null

    if (selectedDate && ampm && hour != null && minute != null) {
      let h24 = Number(hour)

      // 12시간 → 24시간 변환
      if (ampm === "PM" && h24 < 12) h24 += 12
      if (ampm === "AM" && h24 === 12) h24 = 0

      const hh = String(h24).padStart(2, "0")
      const mm = String(minute).padStart(2, "0")

      // 예: "2025-11-27T21:30:00"
      dueDate = `${selectedDate}T${hh}:${mm}:00`
    }

    const payload = {
      title,
      description: "프론트에서 추가한 Todo",
      priority: 2,
      dueDate, // ⬅️ 날짜+시간 들어간 문자열
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

  // 🔽 달력에서 날짜 클릭 시
  const handleSelectDate = async (dateStr) => {
    try {
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

  return (
    <div className="app-root">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">Todo Calendar</h1>
          <p className="app-subtitle">달력을 눌러 날짜별 Todo를 관리해보세요</p>
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
        {upcomingTodos.length > 0 && (
          <section className="upcoming-section">
            <h2>다가오는 일정</h2>
            <ul className="upcoming-list">
              {upcomingTodos.map((todo) => (
                <li key={todo.id} className="upcoming-item">
                  <div className="upcoming-main">
                    <span className="upcoming-title">{todo.title}</span>
                    <span className="upcoming-date">
                      {formatUpcomingDate(todo.dueDate)} ·{" "}
                      {getDdayLabelFromDate(todo.dueDate)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 🔽 전체 / 선택된 날짜 Todo 목록 섹션 */}
        <section className="summary-section">
          <div className="summary-header">
            <h2>
              {selectedDate ? `${selectedDate} Todo 목록` : "전체 Todo 목록"}
            </h2>

            <div className="summary-header-right">
              <button
                type="button"
                className="summary-all-btn"
                onClick={handleShowAll}
              >
                전체 Todo 보기
              </button>
              <button
                type="button"
                className="sort-toggle-btn"
                onClick={handleToggleSortDirection}
              >
                {sortDirection === "desc" ? "최신 날짜순" : "오래된 날짜순"}
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
