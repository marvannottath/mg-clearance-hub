import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    proxy: {
      '/sap-api': {
        target: 'https://lemrg.hstconnect.in:8081',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/sap-api/, '')
      },
      '/sf-api': {
        target: 'https://momentum-computing-8775--sbox5.sandbox.my.salesforce-sites.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/sf-api/, '')
      },
      '/sf-instance': {
        target: 'https://momentum-computing-8775--sbox5.sandbox.my.salesforce.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/sf-instance/, '')
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
