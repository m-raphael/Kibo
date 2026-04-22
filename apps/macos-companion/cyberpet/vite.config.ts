import { defineConfig } from 'vite'
import { resolve }      from 'path'

export default defineConfig({
  root: 'src',
  clearScreen: false,
  resolve: {
    alias: {
      '@cyberpet/mascot-core':     resolve(__dirname, 'packages/mascot-core/src/index.ts'),
      '@cyberpet/mascot-renderer': resolve(__dirname, 'packages/mascot-renderer/src/index.ts'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
