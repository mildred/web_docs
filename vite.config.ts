import { defineConfig, transformWithEsbuild } from 'vite'
import { resolve } from 'path'
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/))  return null

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        })
      },
    },
    react()
  ],

  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },

  build: {
    emptyOutDir: !process.env.ROLLUP_STEP,
    target: 'esnext',
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
    rollupOptions: process.env.ROLLUP_STEP == 'pagedjs-polyfill' ? {
      input: {
        'pagedjs-polyfill': resolve(__dirname , './node_modules/pagedjs/src/polyfill/polyfill.js'),
      },
      output: [
        {
          inlineDynamicImports: false,
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          format: 'iife',
        }
      ]
    } : {
      input: {
        main: resolve(__dirname , './index.html'),
        pagedjs: resolve(__dirname , './node_modules/pagedjs/src/index.js'),
        'pagedjs-polyfill': resolve(__dirname , './node_modules/pagedjs/src/polyfill/polyfill.js'),
      },
      output: [
        {
          inlineDynamicImports: false,
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          format: 'es',
        }
      ]
    }
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
