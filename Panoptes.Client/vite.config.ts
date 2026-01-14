import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-aws': ['aws-amplify'],
          'vendor-charts': ['recharts'],
          'vendor-animation': ['framer-motion'],
        }
      }
    }
  },
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
