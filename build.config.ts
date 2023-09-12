import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    './src/index',
  ],
  outDir: 'dist',
  alias: {
    '#app': '.',
  },
  rollup: {
    esbuild: {
      target: 'esnext',
      format: 'esm',
      minify: true,
      treeShaking: true,
      platform: 'node',
    },
    inlineDependencies: true,
  },
  clean: true,
})
