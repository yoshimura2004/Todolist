import { useState } from "react"

function formatDate(dateStr) {
  if (!dateStr) return "날짜 없음"

  const d = new Date(dateStr)
  // 예: 2025. 11. 21 (금)
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  })
}

function TodoItem({ todo, onDelete, onToggle, onUpdate }) {
  const isDone = todo.status === "DONE"

  // ✅ 수정 모드 관련 상태
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  const handleSave = () => {
    const trimmed = editTitle.trim()
    if (!trimmed) return

    onUpdate(todo.id, { title: trimmed })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(todo.title) // 원래 제목으로 되돌리기
    setIsEditing(false)
  }

  return (
    <div className={`todo-card ${isDone ? "done" : ""}`}>
      <div className="todo-card-main">
        {/* 🔹 날짜 라벨 */}
        <div className="todo-date">{formatDate(todo.dueDate)}</div>

        {/* ✏️ 수정 모드일 때 */}
        {isEditing ? (
          <input
            className="todo-input" // 기존 인풋 스타일 재사용
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        ) : (
          // 평소 표시 모드
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
