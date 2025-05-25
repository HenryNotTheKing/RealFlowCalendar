import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(),
    electron({
      main: {
        entry: 'electron/main.js',
      },
      preload: {
        input: 'electron/preload.mjs'
      }
    })
  ],
  base: process.env.NODE_ENV === 'production' ? './' : '/', // 添加base配置替代publicPath
  build: {
    outDir: '../dist',
    assetsDir: '.',
    rollupOptions: {
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    }
  }
})