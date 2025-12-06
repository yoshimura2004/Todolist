import { useState, useEffect, useRef } from "react"
import TodoItem from "./TodoItem"

function TodoList({ todos = [], onDelete, onToggle, onUpdate }) {
  const PAGE_SIZE = 5

  const [currentPage, setCurrentPage] = useState(1)
  const touchStartXRef = useRef(null)

  const totalItems = todos.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  // 리스트가 바뀌면 1페이지로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [totalItems])

  const startIndex = (currentPage - 1) * PAGE_SIZE
  const visibleTodos = todos.slice(startIndex, startIndex + PAGE_SIZE)

  const goPrevPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev))
  }

  const goNextPage = () => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev))
  }

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return
    touchStartXRef.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    const startX = touchStartXRef.current
    if (startX == null) return

    const endX = e.changedTouches?.[0]?.clientX ?? startX
    const diffX = endX - startX
    const THRESHOLD = 50

    if (diffX > THRESHOLD) {
      // 👉 오른쪽 스와이프 = 이전 페이지
      goPrevPage()
    } else if (diffX < -THRESHOLD) {
      // 👈 왼쪽 스와이프 = 다음 페이지
      goNextPage()
    }

    touchStartXRef.current = null
  }

  return (
    <div
      className="todo-list-wrapper"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="todo-list">
        {visibleTodos.length === 0 ? (
          <p className="empty-text">등록된 Todo가 없습니다.</p>
        ) : (
          visibleTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onDelete={onDelete}
              onToggle={onToggle}
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="todo-pagination">
          <button
            type="button"
            className="todo-page-btn"
            onClick={goPrevPage}
            disabled={currentPage === 1}
          >
            이전
          </button>

          <div className="todo-page-center">
            <span className="page-number">
              {currentPage} / {totalPages}
            </span>
            <div className="page-dots">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <span
                  key={idx}
                  className={
                    "page-dot" + (idx + 1 === currentPage ? " active" : "")
                  }
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="todo-page-btn"
            onClick={goNextPage}
            disabled={currentPage === totalPages}
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}

export default TodoList
