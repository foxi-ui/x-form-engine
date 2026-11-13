import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // 与主仓库一致：antd 4 / Designable 的样式副作用 import 在测试中无需真实编译。
    css: false,
    server: {
      deps: {
        // 让 @x-form-engine/* 走 Vite 打包解析（而非 Node 原生 ESM external），
        // 以正确解析 tsup 产物中的 `react/jsx-runtime`（react@17 无 exports map，
        // 需 bundler 式扩展名解析；真实消费方同样使用 bundler）。
        inline: [/@x-form-engine\//],
      },
    },
  },
});
