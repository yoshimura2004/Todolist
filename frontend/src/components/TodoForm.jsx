import { useState } from "react"

function TodoForm({ onAdd }) {
  const [title, setTitle] = useState("")

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    onAdd({ title: trimmed })
    setTitle("")
  }

  return (
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
  )
}

export default TodoForm
