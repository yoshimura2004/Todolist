// src/components/TodoItem.jsx
import { useState } from "react"

function formatDate(todo) {
  const dateStr = todo.dueDate || todo.createdAt
  if (!dateStr) return "날짜 없음"

  const d = new Date(dateStr)
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })
}

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

  // ✅ 오늘 일정인지 여부
  const isToday =
    todo.dueDate &&
    new Date(todo.dueDate).toDateString() === new Date().toDateString()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (!trimmed) return
    onUpdate(todo.id, { title: trimmed })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(todo.title)
    setIsEditing(false)
  }

  const ddayLabel = getDdayLabel(todo)

  return (
    <div className={`todo-card ${isDone ? "done" : ""} ${isToday ? "today" : ""}`}>
      <div className="todo-card-main">
        <div className="todo-date">
          {formatDate(todo)}
          {ddayLabel && <span className="todo-dday">{ddayLabel}</span>}
        </div>

        {isEditing ? (
          <input
            className="todo-input"
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
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
