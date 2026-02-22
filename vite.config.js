import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Hackathon-4/',
  plugins: [react()],
  server: {
    port: 5173
  }
})