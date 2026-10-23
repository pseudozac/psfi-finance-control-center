import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative paths make the built preview work when opened directly as a local file.
  base: './',
  plugins: [react()],
})

