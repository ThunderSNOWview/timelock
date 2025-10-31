import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      process: "process/browser",
      stream: "stream-browserify",
      zlib: "browserify-zlib",
      util: 'util',
      '@safe-globalThis/safe-apps-provider': '@safe-global/safe-apps-provider',
      '@safe-globalThis/safe-apps-sdk': '@safe-global/safe-apps-sdk',
    }
  },
  optimizeDeps: {
    include: ['process', 'stream-browserify', 'browserify-zlib', 'util']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: [
        '@safe-global/safe-apps-provider',
        '@safe-global/safe-apps-sdk',
        '@safe-globalThis/safe-apps-provider',
        '@safe-globalThis/safe-apps-sdk'
      ]
    }
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
