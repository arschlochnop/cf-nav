/**
 * Vitest 配置文件 - 后端测试
 *
 * 功能说明:
 * - 使用 @cloudflare/vitest-pool-workers 模拟 Workers 环境
 * - 配置 D1 数据库测试环境
 * - 设置代码覆盖率目标为 80%
 * - 支持 TypeScript 类型检查
 */

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    // 使用 Workers 专用测试池（支持 D1, KV, R2 等 Cloudflare 绑定）
    poolOptions: {
      workers: {
        // 使用项目的 wrangler.toml 配置
        wrangler: {
          configPath: './wrangler.toml',
        },
        // 使用本地 D1 数据库进行测试
        miniflare: {
          bindings: {
            // 测试环境变量
            NODE_ENV: 'test',
          },
        },
      },
    },

    // 全局设置
    globals: true, // 启用全局测试 API（describe, it, expect 等）
    environment: 'node', // 测试环境

    // 覆盖率配置
    coverage: {
      provider: 'v8', // 使用 V8 覆盖率提供器
      reporter: ['text', 'json', 'html'], // 输出格式
      exclude: [
        // 排除文件
        'node_modules/**',
        'tests/**',
        '**/*.config.ts',
        '**/*.d.ts',
        'migrations/**',
        'drizzle.config.ts',
      ],
      thresholds: {
        // 覆盖率阈值（低于此值测试失败）
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // 测试文件匹配模式
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
    ],

    // 排除文件
    exclude: [
      'node_modules',
      'dist',
      '.wrangler',
    ],

    // 测试超时设置（毫秒）
    testTimeout: 10000, // 单个测试 10 秒超时
    hookTimeout: 30000, // 钩子函数 30 秒超时（用于数据库迁移等）

    // 每个测试前后自动重置模拟对象
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
