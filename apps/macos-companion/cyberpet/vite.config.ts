import { defineConfig } from 'vite'
import { resolve }      from 'path'

export default defineConfig(({ mode }) => ({
  root: 'src',
  clearScreen: false,

  // Load .env.<mode> files alongside the default .env
  envDir: resolve(__dirname),

  resolve: {
    alias: {
      '@cyberpet/shared':          resolve(__dirname, 'packages/shared/src/index.ts'),
      '@cyberpet/mascot-core':     resolve(__dirname, 'packages/mascot-core/src/index.ts'),
      '@cyberpet/mascot-renderer': resolve(__dirname, 'packages/mascot-renderer/src/index.ts'),
    },
  },

  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Expose mode to the app as import.meta.env.VITE_ENV
    rollupOptions: {
      output: {
        // Fingerprinted assets — safe for long-term caching in staging/prod
        entryFileNames: mode === 'development' ? '[name].js' : '[name]-[hash].js',
      },
    },
  },

  envPrefix: ['VITE_', 'TAURI_'],

  define: {
    // Accessible as __APP_ENV__ in source (no VITE_ prefix needed)
    __APP_ENV__: JSON.stringify(mode),
  },
}))
