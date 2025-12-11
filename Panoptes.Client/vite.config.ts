import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  server: {
    port: 5173,      // CHANGED: From 3000 to 5173 to match Terraform
    strictPort: true, // ADDED: Prevents auto-switching to 5174/3001 if port is busy
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
      },
      '/assets': {
        target: 'http://localhost:5173', // CHANGED: Updated to match new frontend port
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