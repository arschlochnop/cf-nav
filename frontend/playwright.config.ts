/**
 * Playwright 配置文件 - E2E 测试
 *
 * 功能说明:
 * - 配置端到端测试环境（Chrome, Firefox, Safari）
 * - 设置测试基准 URL 和超时时间
 * - 配置测试报告和截图策略
 * - 支持并行测试和重试机制
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * 环境变量配置
 * - PORT: 本地开发服务器端口（默认 5173）
 * - CI: 是否在 CI 环境运行
 */
const PORT = process.env.PORT || 5173;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  // 测试目录
  testDir: './tests/e2e',

  // 全局设置
  fullyParallel: true, // 完全并行运行测试（提高速度）
  forbidOnly: !!process.env.CI, // CI 环境禁止 test.only（防止意外跳过测试）
  retries: process.env.CI ? 2 : 0, // CI 环境重试 2 次，本地不重试
  workers: process.env.CI ? 1 : undefined, // CI 环境单线程（避免资源竞争），本地自动

  // 测试报告
  reporter: [
    ['html', { open: 'never' }], // HTML 报告（不自动打开）
    ['list'], // 终端列表输出
    ['json', { outputFile: 'playwright-report/results.json' }], // JSON 报告（用于 CI）
  ],

  // 全局超时设置
  timeout: 30 * 1000, // 单个测试 30 秒超时
  expect: {
    timeout: 5 * 1000, // expect 断言 5 秒超时
  },

  // 测试使用的配置
  use: {
    // 基准 URL（所有 page.goto('/') 会自动加上此前缀）
    baseURL: BASE_URL,

    // 追踪配置（用于调试失败的测试）
    trace: 'on-first-retry', // 仅在重试时记录追踪

    // 截图策略
    screenshot: 'only-on-failure', // 仅失败时截图

    // 视频录制
    video: 'retain-on-failure', // 仅保留失败测试的视频

    // 浏览器上下文配置
    viewport: { width: 1280, height: 720 }, // 默认视口大小
    ignoreHTTPSErrors: true, // 忽略 HTTPS 错误（用于本地开发）

    // 超时设置
    actionTimeout: 10 * 1000, // 单个操作 10 秒超时（点击、填写等）
    navigationTimeout: 30 * 1000, // 导航 30 秒超时
  },

  // 多浏览器测试配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // 移动端测试（可选）
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // 开发服务器配置（自动启动）
  webServer: {
    command: 'npm run dev', // 启动命令
    url: BASE_URL, // 健康检查 URL
    reuseExistingServer: !process.env.CI, // 本地环境复用已启动的服务器
    timeout: 120 * 1000, // 服务器启动超时 2 分钟
    stdout: 'ignore', // 忽略服务器输出（避免干扰测试日志）
    stderr: 'pipe', // 显示服务器错误
  },
});
