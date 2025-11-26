// src/components/TodoItem.jsx
import { useState } from "react"

// ISO 문자열 → 로컬 기준 YYYY-MM-DD
const toLocalDateStr = (isoString) => {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// Todo에서 시간 부분(오전/오후, 시, 분) 추출
const parseTimeFromTodo = (todo) => {
  const base = todo.dueDate || todo.createdAt
  if (!base) {
    return { ampm: "AM", hour: "9", minute: "0" }
  }

  const d = new Date(base)
  const h24 = d.getHours()
  const m = d.getMinutes()

  const ampm = h24 >= 12 ? "PM" : "AM"
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12

  return {
    ampm,
    hour: String(h12),
    minute: String(m),
  }
}

// 날짜 + 시간 표시용
function formatDateTime(todo) {
  const dateStr = todo.dueDate || todo.createdAt
  if (!dateStr) {
    return { datePart: "날짜 없음", timePart: "" }
  }

  const d = new Date(dateStr)

  const datePart = d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })

  const timePart = d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return { datePart, timePart }
}

// D-Day 라벨
function getDdayLabel(todo) {
  if (!todo.dueDate) return null

  const today = new Date()
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const d = new Date(todo.dueDate)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const diffDays = Math.round(
    (target - base) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) return "오늘"
  if (diffDays === 1) return "하루 남음"
  if (diffDays > 1) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)}`
}

function TodoItem({ todo, onDelete, onToggle, onUpdate }) {
  const isDone = todo.status === "DONE"

  const isToday =
    todo.dueDate &&
    new Date(todo.dueDate).toDateString() === new Date().toDateString()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  // ⬇️ 시간 수정용 state
  const initialTime = parseTimeFromTodo(todo)
  const [ampm, setAmpm] = useState(initialTime.ampm)
  const [hour, setHour] = useState(initialTime.hour)
  const [minute, setMinute] = useState(initialTime.minute)

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (!trimmed) return

    // 날짜는 기존 dueDate(없으면 createdAt)의 날짜 부분 유지
    const baseIso = todo.dueDate || todo.createdAt || new Date().toISOString()
    const dateStr = toLocalDateStr(baseIso)

    // 12시간 → 24시간 변환
    let h24 = Number(hour)
    if (ampm === "PM" && h24 < 12) h24 += 12
    if (ampm === "AM" && h24 === 12) h24 = 0

    const hh = String(h24).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    const newDueDate = `${dateStr}T${hh}:${mm}:00`

    onUpdate(todo.id, { title: trimmed, dueDate: newDueDate })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(todo.title)
    const t = parseTimeFromTodo(todo)
    setAmpm(t.ampm)
    setHour(t.hour)
    setMinute(t.minute)
    setIsEditing(false)
  }

  const ddayLabel = getDdayLabel(todo)
  const { datePart, timePart } = formatDateTime(todo)

  const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i))

  return (
    <div className={`todo-card ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}>
      <div className="todo-card-main">
        {/* 날짜+시간+D-Day 줄 */}
        <div className="todo-date-row">
          <span className="todo-date-main">{datePart}</span>
          {timePart && <span className="todo-time">{timePart}</span>}
          {ddayLabel && <span className="todo-dday">{ddayLabel}</span>}
        </div>

        {isEditing ? (
          <>
            {/* 제목 수정 인풋 */}
            <input
              className="todo-input"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            {/* 시간 수정 select */}
            <div className="todo-time-inline">
              <select
                className="time-select time-select-sm time-select-ampm"
                value={ampm}
                onChange={(e) => setAmpm(e.target.value)}
              >
                <option value="AM">오전</option>
                <option value="PM">오후</option>
              </select>

              <select
                className="time-select time-select-sm time-select-hour"
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
                className="time-select time-select-sm time-select-minute"
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
          </>
        ) : (
          <div className="todo-title">
            {isDone ? "✅ " : "○ "}
            {todo.title}
          </div>
        )}

        {todo.description && (
          <div className="todo-desc">{todo.description}</div>
        )}
      </div>

      <div className="todo-card-footer">
        {isEditing ? (
          <>
            <button
              type="button"
              className="todo-toggle-btn"
              onClick={handleSave}
            >
              저장
            </button>
            <button
              type="button"
              className="todo-delete-btn"
              onClick={handleCancel}
              style={{ marginLeft: 8 }}
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="todo-toggle-btn"
              onClick={() => onToggle(todo.id)}
            >
              {isDone ? "되돌리기" : "완료"}
            </button>
            <button
              type="button"
              className="todo-toggle-btn"
              onClick={() => setIsEditing(true)}
              style={{ marginLeft: 8 }}
            >
              수정
            </button>
            <button
              className="todo-delete-btn"
              type="button"
              onClick={() => onDelete(todo.id)}
              style={{ marginLeft: 8 }}
            >
              삭제
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default TodoItem
