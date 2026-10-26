// Unit tests (jsdom). Real-browser tests live in tests/e2e and run with `npm run test:e2e`.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{js,jsx}'],
    setupFiles: ['tests/unit/setup.js'],
    restoreMocks: true,
  },
})
