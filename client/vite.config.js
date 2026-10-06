import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev only: forward /api to the Express server so no CORS setup is needed locally.
  server: { proxy: { '/api': 'http://localhost:4000' } },
})
