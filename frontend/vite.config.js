import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {                     // ⬅️ 경로 키 추가
        target: 'http://localhost:4000', // 백엔드 포트와 동일
        changeOrigin: true,
      },
    },
  },
})
