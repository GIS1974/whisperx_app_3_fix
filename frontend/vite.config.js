import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // listen on all addresses (localhost, 127.0.0.1, LAN IP)
    port: 5173,      // keep a consistent port
    strictPort: true // fail if 5173 is taken instead of silently changing
  },
})
