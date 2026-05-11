import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const backendHost = process.env.VITE_BACKEND_HOST || 'localhost'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: `http://${backendHost}:8000`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: `ws://${backendHost}:8000`,
        ws: true
      }
    }
  }
})
