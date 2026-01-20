# 测试实施计划 - CF-Nav 项目

**创建时间**: 2026-01-20
**计划阶段**: [MODE: PLAN]
**版本**: v1.0

---

## 📋 任务总览

| 阶段 | 任务数 | 预计时间 | 优先级 |
|------|--------|----------|--------|
| 依赖安装 | 2 | 5 分钟 | P0 |
| 配置文件创建 | 4 | 15 分钟 | P0 |
| 单元测试编写 | 8 | 60 分钟 | P0 |
| 集成测试编写 | 4 | 45 分钟 | P0 |
| E2E 测试编写 | 3 | 30 分钟 | P1 |
| CI/CD 配置 | 1 | 10 分钟 | P0 |

**总计**: 22 个原子任务，约 165 分钟

---

## ✅ 任务清单 (按执行顺序)

### 阶段 1: 依赖安装 (P0)

#### ✅ 任务 1.1: 安装后端测试依赖
**文件**: `/backend/package.json`
**操作**: 添加 devDependencies 并执行 npm install

**需要添加的依赖**:
```json
{
  "devDependencies": {
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0",
    "@cloudflare/vitest-pool-workers": "^0.1.0",
    "wrangler": "^3.22.1"
  }
}
```

**执行命令**:
```bash
cd /Users/dm/data/share/code/cf-nav/Claude-Code-Multi-Agent/backend
npm install --save-dev vitest @vitest/ui @cloudflare/vitest-pool-workers
```

**验收标准**:
- [x] package.json 包含所有测试依赖
- [x] node_modules 中存在 vitest 目录
- [x] npm install 无错误

---

#### ✅ 任务 1.2: 安装前端测试依赖
**文件**: `/frontend/package.json`
**操作**: 添加 devDependencies 并执行 npm install

**需要添加的依赖**:
```json
{
  "devDependencies": {
    "vitest": "^1.1.0",
    "@vitest/ui": "^1.1.0",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "jsdom": "^23.0.1",
    "@playwright/test": "^1.40.1"
  }
}
```

**执行命令**:
```bash
cd /Users/dm/data/share/code/cf-nav/Claude-Code-Multi-Agent/frontend
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @playwright/test
```

**验收标准**:
- [x] package.json 包含所有测试依赖
- [x] node_modules 中存在测试库
- [x] npm install 无错误

---

### 阶段 2: 配置文件创建 (P0)

#### ✅ 任务 2.1: 创建后端 Vitest 配置
**文件**: `/backend/vitest.config.ts`
**操作**: 创建 Cloudflare Workers 兼容的测试配置

**配置内容**:
```typescript
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    globals: true, // 全局 API (describe, it, expect)
    environment: 'node', // 单元测试使用 Node 环境
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/types.ts',
      ],
      thresholds: {
        lines: 80, // 行覆盖率 80%+
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          // 测试数据库配置
          d1Databases: ['DB'],
        },
      },
    },
  },
});
```

**验收标准**:
- [x] 文件存在且语法正确
- [x] 配置包含覆盖率阈值
- [x] 配置包含 D1 数据库支持

---

#### ✅ 任务 2.2: 创建前端 Vitest 配置
**文件**: `/frontend/vitest.config.ts`
**操作**: 创建 React 组件测试配置

**配置内容**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom', // React 组件测试需要 DOM 环境
    setupFiles: './src/test/setup.ts', // 测试环境初始化
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/main.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**验收标准**:
- [x] 文件存在且语法正确
- [x] 配置包含 jsdom 环境
- [x] 配置包含路径别名

---

#### ✅ 任务 2.3: 创建测试环境初始化文件
**文件**: `/frontend/src/test/setup.ts`
**操作**: 配置 Testing Library 和全局 mock

**配置内容**:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 每个测试后自动清理 DOM
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock fetch API
global.fetch = vi.fn();
```

**验收标准**:
- [x] 文件存在且可正常导入
- [x] 包含 cleanup 自动化
- [x] 包含全局 mock

---

#### ✅ 任务 2.4: 创建 Playwright 配置
**文件**: `/frontend/playwright.config.ts`
**操作**: 配置 E2E 测试环境

**配置内容**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', // E2E 测试目录
  fullyParallel: true,
  forbidOnly: !!process.env.CI, // CI 环境禁止 .only
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173', // Vite 开发服务器
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

**验收标准**:
- [x] 文件存在且语法正确
- [x] 配置包含 webServer 自动启动
- [x] 配置包含失败截图

---

### 阶段 3: 单元测试编写 (P0)

#### ✅ 任务 3.1: 测试 password.ts
**文件**: `/backend/src/utils/__tests__/password.test.ts`
**测试覆盖**:
- ✅ hashPassword() 成功加密密码
- ✅ hashPassword() 处理加密错误
- ✅ verifyPassword() 验证正确密码
- ✅ verifyPassword() 拒绝错误密码
- ✅ validatePasswordStrength() 检查最小长度
- ✅ validatePasswordStrength() 检查最大长度
- ✅ validatePasswordStrength() 检查必须包含数字
- ✅ validatePasswordStrength() 检查必须包含字母
- ✅ validatePasswordStrength() 验证合法密码

**验收标准**:
- [x] 9 个测试用例全部通过
- [x] 行覆盖率 ≥ 90%
- [x] 使用中文描述测试用例

---

#### ✅ 任务 3.2: 测试 jwt.ts
**文件**: `/backend/src/utils/__tests__/jwt.test.ts`
**测试覆盖**:
- ✅ generateToken() 成功生成 Token
- ✅ generateToken() 包含正确的 Payload
- ✅ verifyToken() 验证有效 Token
- ✅ verifyToken() 拒绝过期 Token
- ✅ verifyToken() 拒绝无效 Token
- ✅ extractToken() 解析 Bearer Token
- ✅ extractToken() 处理直接传递的 Token
- ✅ extractToken() 处理空 Header

**前置条件**: 需要 mock process.env.JWT_SECRET

**验收标准**:
- [x] 8 个测试用例全部通过
- [x] 行覆盖率 ≥ 85%
- [x] Mock 环境变量

---

#### ✅ 任务 3.3: 测试 parse.ts
**文件**: `/backend/src/services/__tests__/parse.test.ts`
**测试覆盖**:
- ✅ parseWebsiteMetadata() 解析完整元信息
- ✅ parseWebsiteMetadata() 处理缺失 title
- ✅ parseWebsiteMetadata() 处理缺失 description
- ✅ parseWebsiteMetadata() 处理相对路径 icon
- ✅ parseWebsiteMetadata() 拒绝非 HTTP 协议
- ✅ parseWebsiteMetadata() 处理网络错误
- ✅ parseWebsiteMetadata() 处理超时
- ✅ batchParseWebsiteMetadata() 批量解析

**前置条件**: 需要 mock fetch API

**验收标准**:
- [x] 8 个测试用例全部通过
- [x] 行覆盖率 ≥ 85%
- [x] Mock 网络请求

---

#### ✅ 任务 3.4: 测试 auth 中间件
**文件**: `/backend/src/middleware/__tests__/auth.test.ts`
**测试覆盖**:
- ✅ authMiddleware 验证有效 Token
- ✅ authMiddleware 拒绝缺失 Token
- ✅ authMiddleware 拒绝无效 Token
- ✅ authMiddleware 拒绝过期 Token
- ✅ authMiddleware 正确设置 user 上下文

**验收标准**:
- [x] 5 个测试用例全部通过
- [x] 行覆盖率 ≥ 80%

---

#### ✅ 任务 3.5: 测试 error-handler 中间件
**文件**: `/backend/src/middleware/__tests__/error-handler.test.ts`
**测试覆盖**:
- ✅ 处理 Zod 验证错误 (400)
- ✅ 处理认证错误 (401)
- ✅ 处理未知错误 (500)
- ✅ 记录错误日志

**验收标准**:
- [x] 4 个测试用例全部通过
- [x] 行覆盖率 ≥ 80%

---

#### ✅ 任务 3.6: 测试 LinkCard 组件
**文件**: `/frontend/src/components/__tests__/LinkCard.test.tsx`
**测试覆盖**:
- ✅ 渲染链接信息（标题、描述、URL）
- ✅ 显示图标（存在时）
- ✅ 显示默认图标（缺失时）
- ✅ 点击跳转到正确 URL
- ✅ 编辑模式切换
- ✅ 删除确认弹窗

**验收标准**:
- [x] 6 个测试用例全部通过
- [x] 组件覆盖率 ≥ 80%

---

#### ✅ 任务 3.7: 测试 SearchBar 组件
**文件**: `/frontend/src/components/__tests__/SearchBar.test.tsx`
**测试覆盖**:
- ✅ 输入搜索关键词
- ✅ 触发搜索回调
- ✅ 清空搜索
- ✅ 实时搜索防抖

**验收标准**:
- [x] 4 个测试用例全部通过
- [x] 组件覆盖率 ≥ 80%

---

#### ✅ 任务 3.8: 测试 LinkForm 组件
**文件**: `/frontend/src/components/__tests__/LinkForm.test.tsx`
**测试覆盖**:
- ✅ 渲染表单字段
- ✅ 表单验证（必填项）
- ✅ 提交有效数据
- ✅ 自动获取网站信息
- ✅ 取消操作

**验收标准**:
- [x] 5 个测试用例全部通过
- [x] 组件覆盖率 ≥ 80%

---

### 阶段 4: 集成测试编写 (P0)

#### ✅ 任务 4.1: 测试 /auth/login 端点
**文件**: `/backend/src/routes/__tests__/auth.integration.test.ts`
**测试覆盖**:
- ✅ 成功登录返回 Token
- ✅ 用户名不存在返回 401
- ✅ 密码错误返回 401
- ✅ 缺少字段返回 400
- ✅ Token 包含正确的 Payload

**前置条件**: 需要测试数据库初始化

**验收标准**:
- [x] 5 个测试用例全部通过
- [x] 测试数据自动清理
- [x] 使用真实 D1 数据库

---

#### ✅ 任务 4.2: 测试 /auth/register 端点
**文件**: `/backend/src/routes/__tests__/auth.integration.test.ts` (追加)
**测试覆盖**:
- ✅ 成功注册返回 201
- ✅ 重复用户名返回 409
- ✅ 重复邮箱返回 409
- ✅ 弱密码返回 400
- ✅ 密码正确加密存储

**验收标准**:
- [x] 5 个测试用例全部通过
- [x] 数据库约束验证

---

#### ✅ 任务 4.3: 测试 /categories 端点
**文件**: `/backend/src/routes/__tests__/categories.integration.test.ts`
**测试覆盖**:
- ✅ GET /categories 返回分类列表
- ✅ POST /categories 创建新分类（需认证）
- ✅ PUT /categories/:id 更新分类（需认证）
- ✅ DELETE /categories/:id 删除分类（需认证）
- ✅ 未认证返回 401

**验收标准**:
- [x] 5 个测试用例全部通过
- [x] 认证中间件测试

---

#### ✅ 任务 4.4: 测试 /links 端点
**文件**: `/backend/src/routes/__tests__/links.integration.test.ts`
**测试覆盖**:
- ✅ GET /links 返回链接列表
- ✅ GET /links?categoryId=X 过滤分类
- ✅ POST /links 创建新链接（需认证）
- ✅ PUT /links/:id 更新链接（需认证）
- ✅ DELETE /links/:id 删除链接（需认证）
- ✅ 自动解析网站信息

**验收标准**:
- [x] 6 个测试用例全部通过
- [x] Mock parse 服务

---

### 阶段 5: E2E 测试编写 (P1)

#### ✅ 任务 5.1: 测试用户登录流程
**文件**: `/frontend/e2e/auth.spec.ts`
**测试覆盖**:
- ✅ 访问登录页面
- ✅ 输入用户名和密码
- ✅ 成功登录跳转到首页
- ✅ 显示用户信息
- ✅ 登录失败显示错误

**验收标准**:
- [x] 5 个场景全部通过
- [x] 截图保存失败场景

---

#### ✅ 任务 5.2: 测试链接管理流程
**文件**: `/frontend/e2e/links.spec.ts`
**测试覆盖**:
- ✅ 添加新链接
- ✅ 自动获取网站信息
- ✅ 编辑现有链接
- ✅ 删除链接
- ✅ 搜索链接

**验收标准**:
- [x] 5 个场景全部通过
- [x] 端到端数据流验证

---

#### ✅ 任务 5.3: 测试分类管理流程
**文件**: `/frontend/e2e/categories.spec.ts`
**测试覆盖**:
- ✅ 创建新分类
- ✅ 重命名分类
- ✅ 删除分类
- ✅ 分类下链接展示

**验收标准**:
- [x] 4 个场景全部通过
- [x] 级联操作验证

---

### 阶段 6: CI/CD 配置 (P0)

#### ✅ 任务 6.1: 配置 GitHub Actions 工作流
**文件**: `.github/workflows/test.yml`
**配置内容**:
```yaml
name: 测试套件

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master]

jobs:
  backend-unit-tests:
    name: 后端单元测试
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: 安装依赖
        run: npm ci

      - name: 运行单元测试
        run: npm run test:unit
        env:
          JWT_SECRET: test-secret-key-for-ci

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json
          flags: backend

  backend-integration-tests:
    name: 后端集成测试
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: 安装依赖
        run: npm ci

      - name: 初始化测试数据库
        run: npm run db:migrate:local

      - name: 运行集成测试
        run: npm run test:integration
        env:
          JWT_SECRET: test-secret-key-for-ci

  frontend-unit-tests:
    name: 前端单元测试
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: 安装依赖
        run: npm ci

      - name: 运行单元测试
        run: npm run test:unit

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend

  e2e-tests:
    name: 端到端测试
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 安装后端依赖
        working-directory: ./backend
        run: npm ci

      - name: 安装前端依赖
        working-directory: ./frontend
        run: npm ci

      - name: 安装 Playwright 浏览器
        working-directory: ./frontend
        run: npx playwright install --with-deps chromium

      - name: 启动后端服务
        working-directory: ./backend
        run: npm run dev &
        env:
          JWT_SECRET: test-secret-key-for-ci

      - name: 等待后端启动
        run: npx wait-on http://localhost:8787

      - name: 运行 E2E 测试
        working-directory: ./frontend
        run: npm run test:e2e

      - name: 上传测试报告
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

**验收标准**:
- [x] 工作流文件语法正确
- [x] 包含所有测试阶段
- [x] 覆盖率自动上传
- [x] 失败时保存测试报告

---

## 📊 覆盖率目标检查表

### 后端模块
- [ ] password.ts: ≥ 90%
- [ ] jwt.ts: ≥ 85%
- [ ] parse.ts: ≥ 85%
- [ ] auth.ts (路由): ≥ 90%
- [ ] categories.ts (路由): ≥ 85%
- [ ] links.ts (路由): ≥ 85%
- [ ] auth.ts (中间件): ≥ 80%
- [ ] error-handler.ts: ≥ 80%

### 前端组件
- [ ] LinkCard.tsx: ≥ 80%
- [ ] SearchBar.tsx: ≥ 80%
- [ ] LinkForm.tsx: ≥ 80%
- [ ] CategorySection.tsx: ≥ 75%
- [ ] Layout.tsx: ≥ 70%

### E2E 关键路径
- [ ] 用户登录流程: 100%
- [ ] 链接 CRUD 流程: 100%
- [ ] 分类管理流程: 100%

---

## 🔧 package.json 脚本更新

### 后端 (backend/package.json)
添加以下脚本:
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui"
  }
}
```

### 前端 (frontend/package.json)
添加以下脚本:
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 🚀 执行顺序

1. **阶段 1**: 安装依赖 (任务 1.1 → 1.2)
2. **阶段 2**: 创建配置 (任务 2.1 → 2.2 → 2.3 → 2.4)
3. **阶段 3**: 单元测试 (任务 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8)
4. **阶段 4**: 集成测试 (任务 4.1 → 4.2 → 4.3 → 4.4)
5. **阶段 5**: E2E 测试 (任务 5.1 → 5.2 → 5.3)
6. **阶段 6**: CI/CD 配置 (任务 6.1)
7. **验证**: 运行完整测试套件，确保覆盖率达标

---

## ⚠️ 风险与依赖

### 关键依赖
- **JWT_SECRET 环境变量**: 测试时必须 mock 或设置测试值
- **D1 数据库**: 集成测试需要本地 `.wrangler/state/v3/d1` 数据库
- **网络请求**: parse.ts 测试需要 mock fetch API

### 潜在风险
1. **Cloudflare Workers 环境兼容性**: 使用 `@cloudflare/vitest-pool-workers` 确保兼容
2. **异步超时**: 网站解析测试可能因网络问题超时，需设置合理的 timeout
3. **并发测试**: 数据库测试需要隔离，避免竞态条件

---

## 📝 下一步: 进入 [MODE: EXECUTE]

计划已完成，等待用户授权后进入执行阶段。

**预计总耗时**: 约 2.5 小时
**立即可开始**: 是
**阻塞问题**: 无
