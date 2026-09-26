import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Route /api (including JevLens's POST /api/jev) to the local Jev server
    // in server/ (npm run dev:server), which holds the TypeSafe key.
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
})
