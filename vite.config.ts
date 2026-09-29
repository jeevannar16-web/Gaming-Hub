import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Hub is deployed as a GitHub Pages project site:
  // https://jeevannar16-web.github.io/Gaming-Hub/
  base: '/Gaming-Hub/',
  plugins: [react()],
  server: {
    port: 5173,
  },
})