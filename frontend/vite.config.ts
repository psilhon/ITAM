import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://127.0.0.1:3001',
        // 不改 origin，保留浏览器原始 origin（https://127.0.0.1:5173）
        // 这样后端 CORS 能正确收到浏览器的 origin 进行校验
        changeOrigin: false,
        secure: false, // 后端使用自签名证书
      },
    },
  },
})
