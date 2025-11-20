import TodoItem from "./TodoItem"

function TodoList({ todos, onDelete, onToggle, onUpdate }) {
  if (!todos || todos.length === 0) {
    return <p className="empty-text">등록된 Todo가 없습니다.</p>
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={onDelete}
          onToggle={onToggle}
          onUpdate={onUpdate} // ✅ 추가
        />
      ))}
    </div>
  )
}

export default TodoList
