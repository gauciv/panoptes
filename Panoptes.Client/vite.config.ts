import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/setup': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      },
      '/Subscriptions': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      },
      '/logs': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, '../assets'),
      '@': path.resolve(__dirname, './src')
    }
  }
})
