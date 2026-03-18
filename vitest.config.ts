import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ['date-fns'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '#app': '/src',
    },
  },
})
