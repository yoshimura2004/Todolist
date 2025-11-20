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

  // 🔽 달력 & 모달 관련 상태
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0~11
  const [selectedDate, setSelectedDate] = useState(null)
  const [dailyTodos, setDailyTodos] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const listToShow = selectedDate ? dailyTodos : todos
  // 초기 전체 목록(원하면 “이번달 전체”로 사용할 수 있음)
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

  const handleAddTodo = async ({ title }) => {
    try {
      setLoading(true)
      setError(null)

      const payload = {
        title,
        description: "프론트에서 추가한 Todo",
        priority: 2,
        // 🔽 모달에서 추가했다면 선택된 날짜로 dueDate 지정
        dueDate: selectedDate ?? null,
      }

      const newTodo = await todoApi.createTodo(payload)

      setTodos((prev) => [newTodo, ...prev])

      // 모달이 열려 있고 해당 날짜면 dailyTodos도 갱신
      if (selectedDate && newTodo.dueDate?.startsWith?.(selectedDate)) {
        setDailyTodos((prev) => [newTodo, ...prev])
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
          />
        </div>

      {/* 🔽 전체 Todo 목록 섹션 */}
      <section className="summary-section">
        <h2>전체 Todo 목록</h2>
        {loading && <p className="status-text">⏳ 처리 중...</p>}
        {error && <p className="status-text error">{error}</p>}

        <TodoList
          todos={listToShow}          // ✅ 여기!
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
          {/* 이 모달 안에서만 사용할 TodoForm */}
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
