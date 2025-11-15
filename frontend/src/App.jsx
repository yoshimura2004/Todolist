import { useEffect, useState } from 'react'
import { fetchHello, createTodo } from './api'

export default function App() {
  const [msg, setMsg] = useState('loading...')
  const [title, setTitle] = useState('')
  const [lastCreated, setLastCreated] = useState(null)

  useEffect(() => {
    fetchHello().then(data => setMsg(data.msg)).catch(() => setMsg('error'))
  }, [])

  const onAdd = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    const todo = await createTodo(title.trim())
    setLastCreated(todo)
    setTitle('')
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Vite + React</h1>
      <p>Backend says: <b>{msg}</b></p>

      <form onSubmit={onAdd} style={{ marginTop: 16 }}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="새 할 일 입력"
        />
        <button type="submit" style={{ marginLeft: 8 }}>추가</button>
      </form>

      {lastCreated && (
        <p style={{ marginTop: 12 }}>
          ✅ 생성됨: #{lastCreated.id} - {lastCreated.title}
        </p>
      )}
    </div>
  )
}
