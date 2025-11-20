// src/api.js (app.js 라고 적어주신 파일)
import axios from "axios"

const API_BASE_URL = "http://localhost:4000"

const api = axios.create({
  baseURL: API_BASE_URL,
})

export const todoApi = {
  // Todo 목록 조회
  async getTodos() {
    const res = await api.get("/todos")
    return res.data
  },

  // ✅ Todo 생성: dueDate까지 같이 보냄
  async createTodo({ title, description, priority = 2, dueDate = null }) {
    const res = await api.post("/todos", {
      title,
      description,
      priority,
      dueDate,           // 🔹 이 줄이 중요
    })
    return res.data.todo
  },

  // 삭제
  async deleteTodo(id) {
    await api.delete(`/todos/${id}`)
  },

  // 상태 토글
  async toggleTodoStatus(id) {
    const res = await api.patch(`/todos/${id}/toggle`)
    return res.data.todo
  },

  // 수정
  async updateTodo(id, payload) {
    const res = await api.patch(`/todos/${id}`, payload)
    return res.data.todo
  },

  // ✅ 날짜별 Todo 조회 (axios로 통일)
  async getTodosByDate(dateStr) {
    const res = await api.get("/todos/by-date", {
      params: { date: dateStr },
    })
    return res.data
  },
}

export default api
