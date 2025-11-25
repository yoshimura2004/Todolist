// src/components/TodoForm.jsx
import { useState } from "react"

function TodoForm({ onAdd }) {
  const [title, setTitle] = useState("")

  // 시간 선택 상태
  const [ampm, setAmpm] = useState("AM")   // AM / PM
  const [hour, setHour] = useState("9")    // 1~12
  const [minute, setMinute] = useState("0") // 0~59

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    // 부모(Home)에 시간 정보까지 넘겨줌
    onAdd({
      title: trimmed,
      ampm,
      hour,
      minute,
    })

    setTitle("")
  }

  // 시, 분 옵션 만들기
  const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1)) // "1"~"12"
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i))   // "0"~"59"

  return (
    <div className="todo-form-wrapper">
      <form className="todo-form" onSubmit={handleSubmit}>
        <input
          className="todo-input"
          type="text"
          placeholder="할 일을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="todo-add-btn" type="submit">
          +
        </button>
      </form>

      {/* 시간 선택 영역 */}
      <div className="todo-time-row">
        <select
          className="time-select time-select-ampm"
          value={ampm}
          onChange={(e) => setAmpm(e.target.value)}
        >
          <option value="AM">오전</option>
          <option value="PM">오후</option>
        </select>

        <select
          className="time-select time-select-hour"
          value={hour}
          onChange={(e) => setHour(e.target.value)}
        >
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h}시
            </option>
          ))}
        </select>

        <select
          className="time-select time-select-minute"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m.padStart(2, "0")}분
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default TodoForm

