/**
 * Vitest 配置文件 - 前端测试
 *
 * 功能说明:
 * - 配置 React 组件测试环境（使用 jsdom）
 * - 集成 Testing Library 和 Jest DOM
 * - 设置代码覆盖率目标为 80%
 * - 支持路径别名 (@/) 和静态资源导入
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()], // 启用 React 插件（支持 JSX/TSX）

  test: {
    // 全局设置
    globals: true, // 启用全局测试 API（describe, it, expect 等）
    environment: 'jsdom', // 使用 jsdom 模拟浏览器环境

    // 测试设置文件（在所有测试前运行）
    setupFiles: ['./src/test/setup.ts'],

    // 覆盖率配置
    coverage: {
      provider: 'v8', // 使用 V8 覆盖率提供器
      reporter: ['text', 'json', 'html', 'lcov'], // 输出格式
      exclude: [
        // 排除文件
        'node_modules/**',
        'src/test/**',
        '**/*.config.ts',
        '**/*.d.ts',
        'src/main.tsx', // 入口文件（仅用于启动应用）
        'src/vite-env.d.ts',
        'dist/**',
      ],
      thresholds: {
        // 覆盖率阈值（低于此值测试失败）
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      // 包含源代码目录
      include: ['src/**/*.{ts,tsx}'],
    },

    // 测试文件匹配模式
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],

    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      'tests/e2e/**', // E2E 测试由 Playwright 处理
    ],

    // 测试超时设置（毫秒）
    testTimeout: 10000, // 单个测试 10 秒超时

    // 每个测试前后自动重置模拟对象
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // CSS 和静态资源处理
    css: {
      modules: {
        classNameStrategy: 'non-scoped', // CSS 模块类名策略
      },
    },
  },

  // 路径解析配置（与 vite.config.ts 保持一致）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
