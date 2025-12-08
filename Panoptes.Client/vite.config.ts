import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 3000,
    proxy: {
      '/Subscriptions': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      },
      '/logs': {
        target: 'http://localhost:5033',
        changeOrigin: true,
        secure: false,
      },
      '/assets': {
        target: 'http://localhost:3000',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const assetsPath = path.resolve(__dirname, '../assets');
            proxyReq.path = proxyReq.path.replace('/assets', assetsPath);
          });
        }
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
