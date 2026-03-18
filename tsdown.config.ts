import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'node',
  clean: true,
  deps: {
    skipNodeModulesBundle: true,
  },
})
