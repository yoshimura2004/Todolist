// src/api.js
import axios from "axios"

const api = axios.create({
  // ✅ 배포 환경에서는 Render API 주소 사용
  baseURL: "https://todoassistant-api.onrender.com/api",
  withCredentials: true,   // ✅ 쿠키(JWT) 자동 포함
})



export const todoApi = {
  getTodos() {
    return api.get("/todos").then((res) => res.data)
  },
  getTodosByDate(dateStr) {
    return api
      .get("/todos/by-date", { params: { date: dateStr } })
      .then((res) => res.data)
  },
  createTodo(payload) {
    return api.post("/todos", payload).then((res) => res.data)
  },
  toggleTodoStatus(id) {
    return api.patch(`/todos/${id}/toggle`).then((res) => res.data)
  },
  updateTodo(id, payload) {
    return api.put(`/todos/${id}`, payload).then((res) => res.data)
  },
  deleteTodo(id) {
    return api.delete(`/todos/${id}`).then((res) => res.data)
  },
}



export default api
