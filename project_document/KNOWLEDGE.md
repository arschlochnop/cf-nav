# 项目知识库

> **格式要求**: 严格遵循 `.claude/output-styles/markdown-focused.md` 格式规范

## 📚 项目概览

### 项目名称
CF-Nav - Cloudflare 导航网站

### 技术栈
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn UI
- **后端**: Cloudflare Workers + Hono + D1 Database + KV
- **ORM**: Drizzle ORM
- **状态管理**: TanStack Query + Zustand
- **部署**: Cloudflare Pages + GitHub Actions

### 架构特点
- **Serverless JAMstack**: 完全基于 Cloudflare 免费套餐
- **全球边缘计算**: CDN 加速，延迟 < 50ms
- **零成本运行**: 免费套餐足够支撑中小型网站

---

## 🎯 核心架构决策

### ADR-001: 前端框架选择 React
- **背景**: 需要选择一个前端框架构建 SPA
- **决策**: React 18 + TypeScript + Vite
- **原因**:
  - 生态系统成熟，组件库丰富（Shadcn UI、DaisyUI）
  - TypeScript 支持完善，类型安全
  - Vite 构建速度快，满足 Cloudflare Pages 20 分钟限制
  - 团队熟悉度高，符合 KISS 原则

### ADR-002: 状态管理双层架构
- **背景**: 需要管理服务端状态和客户端状态
- **决策**: TanStack Query（服务端） + Zustand（客户端）
- **原因**:
  - 职责分离（单一职责原则）
  - TanStack Query 自动缓存、重试、同步
  - Zustand 轻量级（< 1KB），API 简洁
  - 避免 Redux 的复杂性

### ADR-003: Workers 框架选择 Hono
- **背景**: 需要轻量级 Web 框架适配 Workers
- **决策**: Hono
- **原因**:
  - 专为 Cloudflare Workers 优化
  - 轻量级（< 20KB），满足脚本大小限制
  - 中间件系统灵活（认证、限流、CORS）
  - TypeScript 支持好

### ADR-004: 缓存策略三层架构
- **背景**: Workers CPU 时间 < 50ms，需要优化性能
- **决策**: CDN + Workers KV + TanStack Query
- **原因**:
  - CDN 缓存静态资源（TTL 1 年）
  - Workers KV 缓存 API 响应（TTL 5-10 分钟）
  - TanStack Query 客户端缓存（staleTime 5 分钟）
  - 三层缓存减少 D1 查询，提升响应速度

### ADR-005: ORM 选择 Drizzle
- **背景**: 需要 ORM 简化 D1 数据库操作
- **决策**: Drizzle ORM
- **原因**:
  - 轻量级（< 100KB），适合 Workers
  - TypeScript 优先，类型推导强大
  - 官方支持 Cloudflare D1
  - 性能接近原生 SQL

### ADR-006: JWT 密钥强制验证
- **背景**: spec-validator 发现 JWT_SECRET 使用不安全的默认值
- **决策**: 启动时强制验证 JWT_SECRET 环境变量
- **原因**:
  - **安全性优先**: 默认密钥在生产环境下可被伪造 Token
  - **快速失败**: 启动时验证，避免运行时错误
  - **符合 SOLID 原则**: 依赖注入模式，配置外部化
- **实施**: `/backend/src/utils/jwt.ts` 添加启动验证逻辑

### ADR-007: CORS 动态域名白名单
- **背景**: spec-validator 发现 CORS 配置为 `origin: '*'` 存在安全隐患
- **决策**: 从环境变量读取允许的域名列表
- **原因**:
  - **防止 CSRF 攻击**: 限制可访问 API 的域名
  - **灵活配置**: 支持多环境（开发/测试/生产）
  - **默认安全**: 默认仅允许本地开发域名
- **实施**: `/backend/src/index.ts` 修改 CORS 中间件配置

### ADR-008: 数据库迁移文件统一管理
- **背景**: spec-validator 发现缺少数据库迁移文件，导致项目无法部署
- **决策**: 创建 `0000_initial_schema.sql` 包含完整 schema
- **原因**:
  - **原子性**: 单一迁移文件确保数据库初始化成功
  - **完整性**: 包含表结构 + 索引 + 默认数据
  - **可重现**: 任何人都能通过迁移文件重建数据库
- **实施**: `/backend/migrations/0000_initial_schema.sql`

### ADR-009: 测试框架选择 Vitest + Playwright
- **背景**: 需要建立完整的测试体系（单元测试 + 集成测试 + E2E测试）
- **决策**: Vitest（单元/集成） + Playwright（E2E）
- **原因**:
  - **Vitest 优势**: Vite 原生支持、速度快（ESM 原生）、API 兼容 Jest
  - **Workers 兼容**: `@cloudflare/vitest-pool-workers` 完美模拟 Workers 环境
  - **Playwright 优势**: 多浏览器支持、自动等待、强大的 DevTools
  - **生态统一**: 前后端使用相同测试框架，降低学习成本
- **实施**:
  - `/backend/vitest.config.ts` - 后端测试配置
  - `/frontend/vitest.config.ts` - 前端测试配置
  - `/frontend/playwright.config.ts` - E2E 测试配置

### ADR-010: 测试覆盖率目标 80%
- **背景**: 需要平衡测试质量和开发效率
- **决策**: 单元测试 80%、集成测试 90% API 覆盖、E2E 100% 关键路径
- **原因**:
  - **80/20 法则**: 80% 覆盖率能发现大部分 bug
  - **成本平衡**: 追求 100% 覆盖率投入产出比低
  - **质量优先**: 关键业务逻辑必须 100% 测试（认证、支付等）
- **实施**: `vitest.config.ts` 中配置 `coverage.thresholds`

### ADR-011: JWT 工具函数依赖注入模式
- **背景**: Cloudflare Workers 环境下无法使用 `process.env` 直接访问环境变量，导致测试失败
- **决策**: JWT 工具函数（`generateToken`/`verifyToken`）采用依赖注入模式，接受 `secret` 参数
- **原因**:
  - **Workers 兼容性**: Cloudflare Workers 通过 `env` 对象传递环境变量，而非 `process.env`
  - **测试友好**: 测试时可以直接传入测试密钥，无需 mock `process.env`
  - **遵循 SOLID**: 依赖倒置原则（DIP），调用方注入依赖而非工具函数直接依赖全局变量
  - **类型安全**: TypeScript 强类型检查确保 `secret` 参数不为空
- **实施**:
  - `jwt.ts`: 修改函数签名添加 `secret: string` 参数
  - `auth.ts`: 从 `c.env.JWT_SECRET` 读取密钥并传递
  - `auth.ts (middleware)`: 认证中间件从 `c.env.JWT_SECRET` 读取密钥
  - `vitest.config.ts`: 通过 `miniflare.bindings` 注入测试密钥

### ADR-012: GitHub-Flow 分支策略
- **背景**: 需要选择合适的 Git 工作流协作开发
- **决策**: 采用 github-flow 简单分支策略
- **原因**:
  - **简单高效**: 只有 main 分支 + 功能分支，学习成本低
  - **持续部署**: 支持快速迭代和持续交付
  - **适合小团队**: 流程轻量，减少分支管理复杂度
  - **代码审查**: 通过 PR 强制 Code Review，确保代码质量
- **工作流**:
  1. 从 main 分支创建功能分支（feature/xxx、fix/xxx、hotfix/xxx）
  2. 在功能分支开发并提交
  3. 提交 Pull Request 到 main 分支
  4. Code Review 通过后合并到 main
  5. main 分支自动部署到生产环境
- **实施**: Git 仓库配置 origin: git@github.com:arschlochnop/cf-nav.git

### ADR-013: 测试数据库初始化 SQL 内联策略
- **背景**: Vitest Workers 环境下测试报错 "D1_ERROR: no such table: users"，数据库 schema 未初始化
- **决策**: 在 `tests/setup.ts` 中内联 SQL 迁移脚本，使用 `beforeAll` 钩子初始化测试数据库
- **原因**:
  - **Workers 文件系统限制**: `@cloudflare/vitest-pool-workers` 环境无法可靠访问本地文件系统
  - **避免路径依赖**: `readFileSync()` 在 Workers 环境下路径解析不一致（`__dirname`、`process.cwd()` 均不可靠）
  - **测试稳定性**: SQL 内联确保测试环境 100% 可重现，不依赖外部文件
  - **D1 API 兼容**: `db.batch()` 批量执行预编译语句比 `db.exec()` 更稳定（避免 duration 错误）
- **实施**:
  - `tests/setup.ts`: 将 `0000_initial_schema.sql` 内容内联为常量 `INITIAL_SCHEMA_SQL`
  - `runMigration()`: 使用 `db.batch(statements.map(stmt => db.prepare(stmt)))` 批量执行
  - `vitest.config.ts`: 配置 `setupFiles: ['./tests/setup.ts']` 自动运行初始化
- **权衡**:
  - **优点**: 测试稳定、无文件依赖、Workers 兼容
  - **缺点**: SQL 内容重复（与 migrations/ 目录重复），需手动同步迁移文件变更
- **维护策略**: 当 `0000_initial_schema.sql` 变更时，必须同步更新 `tests/setup.ts` 中的 `INITIAL_SCHEMA_SQL`

### ADR-014: Cloudflare 部署配置安全加固
- **背景**: wrangler.toml 初始配置存在 JWT_SECRET 明文存储安全隐患，违反最佳实践
- **决策**: 使用 Wrangler Secret 管理敏感配置，配置文件仅存放非敏感变量
- **原因**:
  - **安全性**: JWT_SECRET 明文存储可被 Git 历史泄露，攻击者可伪造 Token
  - **最佳实践**: Cloudflare 官方推荐使用 `wrangler secret put` 命令管理敏感信息
  - **分离原则**: 敏感配置（secret）与非敏感配置（vars）分离管理
- **实施**:
  - `backend/wrangler.toml`: 移除所有环境的 JWT_SECRET 配置，添加 ALLOWED_ORIGINS 变量
  - 部署前执行: `wrangler secret put JWT_SECRET` 和 `wrangler secret put JWT_SECRET --env dev`
  - 生成安全密钥: `openssl rand -base64 32` 生成 256-bit 随机密钥
- **配置示例**:
  ```toml
  [vars]
  ENVIRONMENT = "production"
  ALLOWED_ORIGINS = "https://cf-nav.pages.dev"  # 部署后填入 Pages 域名
  ```
- **密钥管理**:
  - 生产环境: `wrangler secret put JWT_SECRET`（手动输入密钥）
  - 开发环境: `wrangler secret put JWT_SECRET --env dev`
  - 验证: `wrangler secret list` 查看已配置的 secret

### ADR-015: Cloudflare Pages SPA 路由配置
- **背景**: React Router 直接访问路由（如 `/dashboard`）会返回 404，需要配置服务器重定向
- **决策**: 创建 `frontend/public/_redirects` 文件配置所有路由重定向到 `index.html`
- **原因**:
  - **SPA 特性**: React Router 使用客户端路由，服务器需将所有路由请求重定向到 index.html
  - **Pages 兼容**: Cloudflare Pages 支持 `_redirects` 文件配置重定向规则
  - **简洁性**: 单行配置 `/* /index.html 200` 解决所有路由问题
- **实施**:
  - `frontend/public/_redirects`: 配置通配符重定向规则
  - 构建时自动复制到 `dist/_redirects`（Vite 默认行为）
- **配置内容**:
  ```
  /* /index.html 200
  ```
- **工作原理**:
  - 用户访问 `/dashboard` → Pages 返回 `index.html`（状态码 200）
  - React Router 接管路由 → 渲染 Dashboard 组件
  - 避免 404 错误，支持直接访问任意前端路由

### ADR-016: 默认管理员密码安全加固
- **背景**: 数据库迁移文件中使用 `$2a$10$YourHashedPasswordHere` 占位符作为默认管理员密码哈希，导致生产部署后登录失败
- **决策**: 使用 bcryptjs 生成真实的 bcrypt 密码哈希，替换占位符
- **原因**:
  - **安全性**: 占位符密码无法通过 bcrypt 验证，导致管理员无法登录
  - **可部署性**: 迁移文件应包含可用的默认数据，支持快速部署和测试
  - **标准化**: 使用 bcrypt 10 轮加密符合行业标准（OWASP 推荐）
  - **文档化**: 注释中明确说明默认密码为 `Admin@123`，提醒生产环境修改
- **实施**:
  - 使用 `bcryptjs.hashSync('Admin@123', 10)` 生成密码哈希
  - 更新 `backend/migrations/0000_initial_schema.sql` 中的密码字段
  - 通过 `wrangler d1 execute` 更新已部署的生产和开发数据库
- **密码策略**:
  - 默认密码：`Admin@123`（8字符，包含大小写字母、数字和特殊符号）
  - 密码哈希：`$2a$10$GZzaLbIlr4viIMuKZNf.OuSaLqhUGtpC9ma7qiGZxffrafdFDAZBK`
  - **警告**: 生产环境部署后必须立即修改默认密码（通过 Web 界面或 API）
- **验证结果**:
  - ✅ 登录成功（POST /api/auth/login 返回 Token）
  - ✅ JWT 认证正常（GET /api/auth/me 返回用户信息）
  - ✅ 密码验证通过（bcrypt.compare 返回 true）

### ADR-017: 一键部署脚本自动化
- **背景**: 手动部署需要 10+ 个步骤（安装依赖、创建数据库、设置密钥、执行迁移、部署等），新手容易出错
- **决策**: 创建 `scripts/deploy.sh` Bash 脚本实现一键自动化部署
- **原因**:
  - **降低门槛**: 从 10+ 步骤简化为 1 行命令，提升新手友好度
  - **减少出错**: 自动化流程避免手动操作遗漏（如忘记设置 JWT_SECRET、数据库迁移）
  - **提高效率**: 部署时间从 30 分钟缩短到 5 分钟以内
  - **标准化**: 确保所有环境（开发/生产）使用相同的部署流程
  - **可维护性**: 脚本包含详细注释和错误提示，易于维护和扩展
- **实施**:
  - **环境检查**: 自动检测 Node.js、npm、wrangler CLI 是否安装
  - **数据库管理**: 自动创建 D1 数据库（如不存在）、执行迁移
  - **密钥管理**: 支持手动输入或自动生成 JWT_SECRET（使用 `openssl rand -base64 32`）
  - **选择性部署**: 支持仅部署后端、仅部署前端、或全部部署
  - **用户交互**: 提供清晰的进度提示和错误信息，引导用户完成部署
- **脚本特性**:
  - 190+ 行 Bash 代码，包含完整的错误处理和用户交互
  - 颜色输出（绿色 INFO、黄色 WARN、红色 ERROR）提升可读性
  - `set -e` 确保遇到错误立即停止，避免部分部署导致的不一致状态
  - 自动检测数据库是否存在，避免重复创建
  - 自动检测 JWT_SECRET 是否设置，避免重复配置

### ADR-018: 用户密码修改功能设计
- **背景**: 系统需要提供安全的密码修改功能，允许已登录用户更新自己的密码
- **决策**: 实现完整的密码修改流程，包括旧密码验证、新密码强度检查、前端实时反馈和全局导航入口
- **原因**:
  - **安全合规**: OWASP 最佳实践要求提供密码修改功能，定期更新密码降低安全风险
  - **用户体验**: 实时密码强度提示和可见性切换提升易用性
  - **全局可访问**: 在顶部导航栏添加入口，用户无需进入特定页面即可修改密码
  - **防止重用**: 检查新旧密码是否相同，避免用户简单重复设置密码
- **实施**:
  - **后端 API (`/api/auth/password`)**:
    - 使用 Zod 验证请求参数（旧密码、新密码最小8字符）
    - 验证旧密码正确性（bcrypt.compare）
    - 验证新密码强度（大小写字母、数字、特殊字符）
    - 检查新旧密码不能相同
    - bcrypt 加密新密码（10轮）后更新数据库
    - 需要 JWT 认证（authMiddleware 保护）
  - **前端页面 (`ChangePassword.tsx`)**:
    - 311行完整组件，包含三个密码输入框（旧密码、新密码、确认密码）
    - 密码可见性切换（Eye/EyeOff 图标，按钮切换 text/password type）
    - 实时密码强度验证函数（validatePasswordStrength）
    - 密码一致性检查（confirmPassword === newPassword）
    - 成功后显示绿色提示并3秒自动跳转 `/admin`
    - Tailwind CSS 样式与现有页面保持一致
  - **导航入口 (`Layout.tsx`)**:
    - 在顶部导航栏用户信息区域添加"修改密码"链接
    - 使用 Key 图标（lucide-react）
    - 灰色背景按钮（与"退出"红色按钮区分）
    - 所有已登录页面都能访问
  - **路由配置 (`App.tsx`)**:
    - 添加受保护路由 `/change-password`
    - 使用 ProtectedRoute 包裹，未登录用户重定向到 `/login`
- **安全特性**:
  - **双重验证**: 客户端实时验证（用户体验） + 服务端严格验证（安全保障）
  - **密码强度**: 最少8字符、含大小写字母、数字、特殊字符
  - **防止重用**: 后端检查新旧密码不能相同
  - **JWT 保护**: 只有已登录用户可以访问修改密码接口
- **用户体验**:
  - **实时反馈**: 输入新密码时立即显示强度提示（红叉/绿勾）
  - **视觉提示**: 成功用绿色、错误用红色、加载用旋转图标
  - **全局导航**: 顶部导航栏始终可见，无需寻找入口
  - **自动跳转**: 成功后3秒自动返回管理页面，减少手动操作

### ADR-019: Drizzle ORM Timestamp 字段类型规范
- **背景**: 密码修改功能在生产环境报错 `value.getTime is not a function`，需要明确 Drizzle ORM timestamp 字段的正确用法
- **决策**: 所有使用 `integer('field_name', { mode: 'timestamp' })` 定义的字段，在 INSERT/UPDATE 时必须传递 JavaScript **Date 对象**而非字符串
- **原因**:
  - **Drizzle 自动转换机制**: `mode: 'timestamp'` 配置告诉 Drizzle 该字段是时间戳
  - **内部处理流程**: Drizzle 接收 Date 对象后自动调用 `Date.getTime()` 转换为 Unix timestamp（整数）存入 SQLite
  - **类型检查失败**: 如果传递字符串（如 `new Date().toISOString()` 返回值），Drizzle 会尝试调用字符串的 `.getTime()` 方法，导致运行时错误
- **错误案例**:
  ```typescript
  // ❌ 错误：返回字符串 "2026-01-21T12:34:56.789Z"
  await db.update(users).set({
    password: hashedPassword,
    updatedAt: new Date().toISOString(), // TypeError!
  });
  ```
- **正确用法**:
  ```typescript
  // ✅ 正确：直接传递 Date 对象
  await db.update(users).set({
    password: hashedPassword,
    updatedAt: new Date(), // Drizzle 自动调用 .getTime()
  });
  ```
- **Schema 定义示例**:
  ```typescript
  export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    // ⬇️ mode: 'timestamp' 配置期望 Date 对象
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  });
  ```
- **数据库行为**:
  - **存储**: SQLite 存储为整数（Unix timestamp 秒级）
  - **读取**: Drizzle 自动将整数转换回 JavaScript Date 对象
  - **默认值**: `sql\`(unixepoch())\`` 在 INSERT 时自动设置当前时间戳
  - **UPDATE 行为**: 默认值**不会**在 UPDATE 时自动更新，需手动设置 `updatedAt: new Date()`
- **代码库一致性检查**:
  - ✅ `categories.ts` 路由正确使用 `updatedAt: new Date()`
  - ✅ `links.ts` 路由正确使用 `updatedAt: new Date()`
  - ❌ `auth.ts` 密码修改接口错误使用 `updatedAt: new Date().toISOString()` → 已修复
- **调试技巧**:
  - 生产环境错误信息被隐藏时，临时修改 `error-handler.ts` 启用详细错误：
    ```typescript
    details: err.message,  // 临时调试，修复后恢复安全配置
    ```
  - 定位错误后立即恢复生产环境安全配置：
    ```typescript
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    ```

### ADR-020: 外部资源 Referer 隐私保护
- **背景**: 导航站引用第三方网站图标时，浏览器默认会发送 Referer 请求头，泄露用户访问的导航站地址
- **决策**: 实施双层 Referer 隐私保护策略（组件级 + 全局级）
- **原因**:
  - **隐私保护**: 防止第三方网站追踪用户访问来源，保护用户浏览行为隐私
  - **安全合规**: 符合 GDPR 和隐私保护最佳实践
  - **双重保障**: 组件级属性 + 全局 meta 标签确保全面覆盖
  - **零性能开销**: 浏览器原生支持，无需额外处理逻辑
- **实施**:
  - **组件级保护** (`LinkCard.tsx`):
    ```typescript
    <img
      src={link.icon}
      referrerPolicy="no-referrer"  // ← 关键属性
      alt={link.title}
      className="w-10 h-10 rounded-lg object-cover"
    />
    ```
  - **全局级保护** (`index.html`):
    ```html
    <meta name="referrer" content="no-referrer" />
    ```
- **技术细节**:
  - **组件级优先**: `referrerPolicy` 属性优先级高于全局 meta 标签
  - **全局兜底**: meta 标签覆盖所有外部资源请求（图片、脚本、样式）
  - **浏览器兼容**: 所有现代浏览器支持（Chrome 51+、Firefox 52+、Safari 11.1+）
- **影响范围**:
  - ✅ **链接图标**: `link.icon` 字段引用的第三方网站 favicon - **已保护**
  - ✅ **分类图标**: `category.icon` 使用 emoji 文本而非外部 URL - **无需保护**
  - ✅ **其他外部资源**: 全局 meta 标签覆盖所有未声明 referrerPolicy 的资源
- **可能的副作用**:
  - **防盗链问题**: 部分网站使用 Referer 检查防止盗链，可能导致图标加载失败
  - **解决方案**: LinkCard 组件已包含 `onError` 处理器，加载失败时自动显示默认 SVG 图标
  - **实际测试**: 大部分公开 API（如 Google Favicon API、DuckDuckGo Icon API）允许无 Referer 请求
- **替代方案比较**:
  1. ~~`referrerPolicy="no-referrer-when-downgrade"`~~: 仍会泄露 HTTPS→HTTPS 的 Referer
  2. ~~Workers 代理转发~~: 增加延迟和服务器负载，过度设计
  3. ~~`data:` URL 内联~~: 增加 HTML 体积，不适合动态图标
  4. **`no-referrer` 策略** ✅: 最简单、最有效、零开销的解决方案

---

## 🛠️ 代码模式与最佳实践
- **未来改进**: 考虑提供 Node.js 版本的部署脚本（跨平台支持）

---

## 🏗️ 代码模式

### 监控可视化组件模式

#### MonitorServiceCard（监控服务卡片）
```typescript
import React from 'react';
import { UptimeTimeline } from './UptimeTimeline';

interface MonitorService {
  id: number;
  name: string; // 服务名称（不包含 URL，隐私保护）
  uptimePercentage: number; // 在线率（0-100，保留 1 位小数）
  currentStatus: 'up' | 'down' | 'slow' | 'unknown';
  timeline: Array<{
    timestamp: number;
    status: 'up' | 'down' | 'slow';
    responseTime: number;
  }>;
}

interface MonitorServiceCardProps {
  service: MonitorService;
  isMobile?: boolean;
}

// 在线率徽章颜色规则（老王我定的标准）
function getUptimeBadgeColor(percentage: number): string {
  if (percentage >= 99.5) return 'bg-green-500 text-white'; // 优秀
  if (percentage >= 95.0) return 'bg-lime-500 text-white'; // 良好
  if (percentage >= 90.0) return 'bg-yellow-500 text-black'; // 警告
  return 'bg-red-500 text-white'; // 危险
}

export const MonitorServiceCard = React.memo<MonitorServiceCardProps>(
  ({ service, isMobile = false }) => {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 transition-all duration-300 hover:scale-102 hover:shadow-lg">
        {/* 顶部：服务名称 + 在线率徽章 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800 truncate max-w-[60%]">
            {service.name}
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${getUptimeBadgeColor(service.uptimePercentage)}`}>
            {service.uptimePercentage.toFixed(1)}%
          </span>
        </div>

        {/* 中部：当前状态指示器 */}
        <div className="flex items-center mb-4">
          <span className={`w-3 h-3 rounded-full mr-2 ${getCurrentStatusColor(service.currentStatus)}`}></span>
          <span className="text-sm text-gray-600">{getCurrentStatusText(service.currentStatus)}</span>
        </div>

        {/* 底部：时间轴组件 */}
        <UptimeTimeline timeline={service.timeline} isMobile={isMobile} />
      </div>
    );
  }
);
```

**设计规范**:
- **卡片布局**: 白色背景、8px 圆角、中等阴影、16px 内边距
- **Hover 效果**: 放大 102%、阴影加深到 lg 级别、300ms 过渡
- **在线率徽章**: 9999px 圆角（完全圆形）、上下 4px/左右 12px 内边距、加粗文字
- **颜色规则**:
  - ≥99.5%: 深绿色 (bg-green-500) - 优秀
  - ≥95.0%: 浅绿色 (bg-lime-500) - 良好
  - ≥90.0%: 黄色 (bg-yellow-500) - 警告
  - <90.0%: 红色 (bg-red-500) - 危险
- **状态指示器**: 3px × 3px 圆点 + 2px 右边距 + 文字
- **性能优化**: 使用 React.memo 避免不必要的重渲染
- **响应式**: 桌面端显示"最近 45 次检测记录"提示，移动端隐藏
- **可访问性**: 完整的 aria-label 标签和 role 属性

**组件依赖**:
- 依赖 UptimeTimeline 组件（显示时间轴条形图）
- 依赖 lucide-react 图标库（未来扩展可能需要）
- 依赖 Tailwind CSS 样式系统

**使用场景**:
- MonitorStatusPage 页面使用，显示多个监控服务的卡片列表
- 每个卡片展示一个被监控网站的可用性状态
- 支持桌面端和移动端响应式显示

### 认证模式

#### JWT Token 生成
```typescript
import jwt from '@tsndr/cloudflare-worker-jwt'

const token = await jwt.sign({
  user_id: 1,
  email: 'admin@example.com',
  exp: Math.floor(Date.now() / 1000) + 86400, // 24 小时
}, env.JWT_SECRET)
```

#### JWT Token 验证（中间件）
```typescript
import { Hono } from 'hono'
import jwt from '@tsndr/cloudflare-worker-jwt'

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.substring(7)
  const isValid = await jwt.verify(token, c.env.JWT_SECRET)
  if (!isValid) {
    return c.json({ error: 'Invalid token' }, 401)
  }

  const payload = jwt.decode(token)
  c.set('user', payload.payload)
  await next()
}
```

### 限流模式

#### Workers KV 限流
```typescript
async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  key: string,
  limit: number,
  ttl: number
): Promise<boolean> {
  const cacheKey = `ratelimit:${key}:${ip}`
  const count = await kv.get(cacheKey)

  if (count && parseInt(count) >= limit) {
    return false // 超过限制
  }

  await kv.put(cacheKey, (parseInt(count || '0') + 1).toString(), {
    expirationTtl: ttl,
  })
  return true
}

// 使用示例
const isAllowed = await checkRateLimit(c.env.KV, c.req.header('CF-Connecting-IP'), 'login', 5, 60)
if (!isAllowed) {
  return c.json({ error: 'Rate limit exceeded' }, 429)
}
```

### 缓存模式

#### Workers KV 缓存查询结果
```typescript
async function getCachedLinks(env: Env) {
  const cacheKey = 'cache:links:all'

  // 尝试从缓存获取
  const cached = await env.KV.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // 缓存未命中，查询数据库
  const db = drizzle(env.DB)
  const links = await db.select().from(linksTable).all()

  // 写入缓存（TTL 5 分钟）
  await env.KV.put(cacheKey, JSON.stringify(links), {
    expirationTtl: 300,
  })

  return links
}

// 清除缓存（创建/更新/删除时调用）
async function invalidateCache(env: Env) {
  await env.KV.delete('cache:links:all')
  await env.KV.delete('cache:categories:all')
}
```

### 网站信息抓取模式

#### 抓取网站 Title、Favicon、Logo
```typescript
import { parseHTML } from 'linkedom'

async function scrapeWebsiteInfo(url: string): Promise<{
  title: string | null
  favicon: string | null
  logo: string | null
}> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CF-Nav/1.0)',
    },
    signal: AbortSignal.timeout(10000), // 10 秒超时
  })

  const html = await response.text()
  const { document } = parseHTML(html)

  // 提取 title
  const title = document.querySelector('title')?.textContent || null

  // 提取 favicon
  const faviconLink = document.querySelector('link[rel="icon"]') ||
                      document.querySelector('link[rel="shortcut icon"]')
  const favicon = faviconLink?.href || `${new URL(url).origin}/favicon.ico`

  // 提取 logo（Open Graph）
  const ogImage = document.querySelector('meta[property="og:image"]')
  const logo = ogImage?.getAttribute('content') || null

  return { title, favicon, logo }
}
```

### Drizzle ORM 查询模式

#### 基础 CRUD
```typescript
import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { links, categories } from './schema'

const db = drizzle(c.env.DB)

// 查询所有链接
const allLinks = await db.select().from(links)

// 按分类查询
const linksByCategory = await db.select()
  .from(links)
  .where(eq(links.categoryId, 1))
  .orderBy(links.orderNum)

// 插入链接
const newLink = await db.insert(links).values({
  url: 'https://github.com',
  title: 'GitHub',
  categoryId: 1,
})

// 更新链接
await db.update(links)
  .set({ title: 'GitHub - 新标题' })
  .where(eq(links.id, 1))

// 删除链接
await db.delete(links).where(eq(links.id, 1))
```

### React Hook 模式

#### useLinks (TanStack Query)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useLinks(categoryId?: number) {
  return useQuery({
    queryKey: ['links', categoryId],
    queryFn: () => api.get('/api/v1/links', { searchParams: { category_id: categoryId } }).json(),
    staleTime: 5 * 60 * 1000, // 5 分钟
  })
}

export function useCreateLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLinkInput) => api.post('/api/v1/admin/links', { json: data }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
  })
}
```

#### useTheme (Zustand)
```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
)
```

### Hono 测试环境配置模式

#### 配置 Bindings 类型和 env 参数
```typescript
import { Hono } from 'hono';
import { authMiddleware } from '@/middleware/auth';
import { generateToken } from '@/utils/jwt';

// 1. 为 Hono 实例添加 Bindings 类型（确保 c.env 类型安全）
let app: Hono<{ Bindings: { JWT_SECRET: string } }>;

beforeEach(() => {
  // 创建带类型的 Hono 实例
  app = new Hono<{ Bindings: { JWT_SECRET: string } }>();

  // 添加需要认证的路由
  app.get('/protected', authMiddleware, (c) => {
    const user = c.get('user');
    return c.json({ success: true, user });
  });
});

// 2. 测试时通过第三个参数传递 env（关键！）
it('应允许携带有效 Token 的请求通过', async () => {
  const token = generateToken(1, 'test', 'test-jwt-secret-key-for-vitest');

  const response = await app.request('/protected', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }, {
    JWT_SECRET: 'test-jwt-secret-key-for-vitest',  // ← 第三个参数传递 env
  });

  expect(response.status).toBe(200);
});
```

**要点**:
- **Workers 环境差异**: Cloudflare Workers 通过 `c.env` 访问环境变量，而非 `process.env`
- **测试必备**: Hono 测试必须在 `app.request()` 第三个参数传递 env 对象
- **类型安全**: Bindings 类型确保 TypeScript 编译时检查 env 属性
- **测试隔离**: 每个 describe 块创建新的 Hono 实例，避免测试间状态污染

---

## ❓ 常见问题

### Q: Drizzle ORM Schema 与数据库迁移不同步怎么办？
**A**: 这是一个常见的陷阱，数据库迁移成功但应用仍然报错。

**问题表现**:
- 数据库迁移成功执行（wrangler d1 execute）
- 但 API 运行时报错："获取监控状态失败"
- 数据库中字段存在，但 Drizzle 无法查询

**根本原因**:
- Drizzle ORM 不会自动读取数据库 schema
- 它依赖 TypeScript schema 定义（如 `backend/src/db/schema.ts`）
- 如果 schema 文件未更新，Drizzle 不知道新字段存在
- 尝试查询未定义字段时会触发运行时错误

**解决方案**:
```typescript
// 数据库迁移: 0001_add_monitor_fields.sql
ALTER TABLE links ADD COLUMN is_monitored INTEGER DEFAULT 0 NOT NULL;

// ✅ 必须同步更新 Drizzle schema:
export const links = sqliteTable('links', {
  // ... 现有字段 ...

  // 新增监控字段（与迁移 SQL 一致）
  isMonitored: integer('is_monitored', { mode: 'boolean' })
    .notNull()
    .default(false),
});
```

**最佳实践**:
1. **先写迁移 SQL**：定义数据库结构变更
2. **同步更新 schema.ts**：添加对应的 Drizzle 字段定义
3. **类型校验**：确保字段类型匹配（SQLite 类型 → Drizzle 类型）
4. **测试验证**：本地测试后再部署到生产环境

**检查清单**:
- [ ] 数据库迁移文件已执行（wrangler d1 execute）
- [ ] schema.ts 已添加新字段定义
- [ ] 字段类型正确（integer/text/timestamp）
- [ ] 默认值与迁移 SQL 一致
- [ ] 本地测试通过
- [ ] 生产环境部署验证

### Q: Workers CPU 时间超出 50ms 怎么办？
**A**: 使用 Workers KV 缓存热点数据，减少 D1 查询次数。示例：
- 缓存首页链接列表（TTL 5 分钟）
- 缓存分类列表（TTL 10 分钟）
- 缓存网站信息抓取结果（TTL 24 小时）

### Q: D1 查询速度慢怎么优化？
**A**: 优化策略：
1. 添加索引（`CREATE INDEX ON links(category_id, order_num)`）
2. 避免复杂联表查询（应用层聚合）
3. 使用 `LIMIT` 分页（每页 20-50 条）
4. 缓存查询结果到 Workers KV

### Q: 如何防止 URL 重复添加？
**A**: 数据库设计使用唯一索引：
```sql
CREATE UNIQUE INDEX idx_links_url ON links(url);
```
应用层也需要检查：
```typescript
const existing = await db.select().from(links).where(eq(links.url, url)).get()
if (existing) {
  return c.json({ error: 'URL already exists' }, 409)
}
```

### Q: 如何实现链接排序拖拽？
**A**: 使用 `dnd-kit` 库：
```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, arrayMove } from '@dnd-kit/sortable'

function LinkList({ links }) {
  const [items, setItems] = useState(links)

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)

        // 更新排序到服务器
        updateOrder(newItems.map((item, index) => ({ id: item.id, order_num: index })))

        return newItems
      })
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={items}>
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id} {...item} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

### Q: 如何实现"记住我"功能？
**A**: 登录时根据 `remember_me` 参数调整 Token 过期时间：
```typescript
const expiresIn = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 天 or 24 小时

const token = await jwt.sign({
  user_id: user.id,
  exp: Math.floor(Date.now() / 1000) + expiresIn,
}, env.JWT_SECRET)
```

### Q: 如何处理抓取超时？
**A**: 使用 `AbortSignal.timeout()` 设置超时：
```typescript
try {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000), // 10 秒超时
  })
} catch (error) {
  if (error.name === 'TimeoutError') {
    return { title: null, favicon: null, logo: null }
  }
  throw error
}
```

### Q: 如何实现深色模式？
**A**: 使用 Tailwind CSS 的 `dark:` 前缀 + Zustand 状态管理：
```typescript
// 1. Zustand Store
const useThemeStore = create((set) => ({
  theme: 'light',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}))

// 2. 根组件应用主题
function App() {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <div>...</div>
}

// 3. 组件中使用
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  内容
</div>
```

---

## 🔧 调试技巧

### Workers 本地调试
```bash
# 启动本地 Workers
wrangler dev

# 查看实时日志
wrangler tail --format pretty

# 调试 D1 数据库
wrangler d1 execute cf-nav-db --local --command "SELECT * FROM links"
```

### TanStack Query DevTools
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  )
}
```

### TypeScript 类型检查
```bash
# 检查类型错误（不生成文件）
tsc --noEmit

# 监听模式
tsc --noEmit --watch
```

---

## 📚 学习资源

### 官方文档
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Hono 文档](https://hono.dev/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [TanStack Query 文档](https://tanstack.com/query/latest)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)

### 教程与文章
- [Cloudflare Workers 最佳实践](https://developers.cloudflare.com/workers/best-practices/)
- [D1 性能优化指南](https://developers.cloudflare.com/d1/platform/limits/)
- [React 18 新特性](https://react.dev/blog/2022/03/29/react-v18)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### 示例项目
- [Cloudflare Workers 示例](https://github.com/cloudflare/workers-sdk/tree/main/templates)
- [Hono 示例应用](https://github.com/honojs/examples)
- [Drizzle ORM 示例](https://github.com/drizzle-team/drizzle-orm/tree/main/examples)

---

## 🚀 性能优化检查清单

### 前端优化
- [ ] 使用代码分割（`React.lazy`）
- [ ] 启用图片懒加载（`loading="lazy"`）
- [ ] 使用 WebP 格式图片
- [ ] 启用 Brotli 压缩（Cloudflare CDN 自动）
- [ ] 移除未使用的 CSS（Tailwind purge）
- [ ] 使用 `React.memo` 优化组件渲染

### 后端优化
- [ ] Workers KV 缓存热点数据
- [ ] 为常用查询字段添加索引
- [ ] 避免 N+1 查询问题
- [ ] 使用批量操作（批量插入、批量删除）
- [ ] 限制单次查询返回数量（分页）
- [ ] 使用 `prepare()` 预编译查询

### 数据库优化
- [ ] 添加必要的索引
- [ ] 定期执行 `ANALYZE`
- [ ] 避免复杂联表查询
- [ ] 使用事务保证原子性
- [ ] 定期备份数据

---

## 🔒 安全检查清单

- [ ] 所有 API 使用 HTTPS
- [ ] JWT Token 存储在 HttpOnly Cookie
- [ ] 密码使用 bcrypt 加密（cost factor ≥ 10）
- [ ] 所有数据库查询使用参数化查询
- [ ] 用户输入经过验证（Zod Schema）
- [ ] 登录接口限流（5 次/分钟）
- [ ] API 接口限流（100 次/分钟）
- [ ] CORS 配置仅允许特定域名
- [ ] Content-Security-Policy 头配置
- [ ] 防止 XSS（React 自动转义）
- [ ] 防止 CSRF（CSRF Token 验证）

---

## 🧪 监控功能测试指南

### 测试文档位置
- **完整测试指南**: `/TEST_GUIDE.md` (300+ 行详细测试步骤)
- **测试目标**: 验证监控状态页面功能是否正常工作

### 测试准备清单
- [ ] 后端服务器启动成功 (`wrangler dev`)
- [ ] 前端服务器启动成功 (`npm run dev`)
- [ ] 数据库 migrations 已执行（0001_add_monitor_fields.sql + 0002_create_monitor_logs.sql）
- [ ] 环境变量配置正确（JWT_SECRET、ALLOWED_ORIGINS）

### 核心测试要点

#### API 端点验证
- **端点**: `GET /api/monitor/status`
- **访问方式**: 公开（无需认证）
- **预期响应**:
  ```json
  {
    "overallStatus": "operational",
    "services": [],
    "lastUpdated": 1737446400
  }
  ```
- **测试命令**: `curl http://localhost:8787/api/monitor/status | jq`

#### 前端页面验证
- **访问地址**: `http://localhost:5173/monitor`
- **页面元素**:
  - ✅ 页面标题："系统监控状态"
  - ✅ 整体状态横幅（OverallStatusBanner）
  - ✅ 服务卡片网格布局（如果有数据）
  - ✅ 空状态提示（如果无数据）
- **响应式设计**:
  - 桌面端（≥768px）: 45 条时间轴 + 2 列网格
  - 移动端（<768px）: 30 条时间轴 + 1 列布局

#### 自动刷新测试
- **刷新间隔**: 30 秒
- **验证方式**: 打开浏览器 Network 标签，观察 API 请求
- **预期行为**:
  - 初始加载：1 次 API 请求
  - 30 秒后：自动发送第 2 次请求
  - 持续刷新：每 30 秒一次

#### 错误处理测试
- **测试步骤**: 停止后端服务器 → 刷新前端页面
- **预期行为**:
  - 显示红色错误提示框
  - 错误消息："获取监控状态失败"
  - 显示"重试"按钮
  - 点击"重试"重新发送请求

#### 移动端测试
- **测试工具**: Chrome DevTools 移动设备模拟
- **测试设备**: iPhone 14 Pro
- **验证要点**:
  - [ ] 1 列服务卡片布局
  - [ ] 时间轴显示 30 个竖条（而非 45 个）
  - [ ] 文字大小适配移动端

### 常见测试问题

#### ❌ 后端启动失败
**症状**: `wrangler dev` 报错
**排查步骤**:
1. 检查 `wrangler.toml` 中的 D1 数据库绑定
2. 确认 `database_id` 正确
3. 确认 `binding = "DB"` 配置正确

#### ❌ CORS 错误
**症状**: 浏览器控制台报错 "CORS policy"
**排查步骤**:
1. 检查 `backend/.env` 中的 `ALLOWED_ORIGINS`
2. 确认包含 `http://localhost:5173`
3. 重启后端服务器

#### ❌ API 返回空数组
**症状**: `{ services: [] }`
**原因**: 数据库中没有启用监控的链接
**解决**: 这是正常的，需要在管理后台启用监控功能

### 测试完成标准
- [x] 后端服务器成功启动
- [x] 前端服务器成功启动
- [x] API 返回正确的 JSON 结构
- [x] 监控页面正确渲染
- [x] 整体状态横幅显示正确
- [x] 空状态提示显示正确
- [x] 移动端布局正确适配
- [x] 自动刷新功能正常工作
- [x] 错误处理正确显示

---

## 📝 部署检查清单

### 部署前
- [ ] 运行 `pnpm run lint` 通过
- [ ] 运行 `pnpm run type-check` 通过
- [ ] 运行 `pnpm run test` 通过
- [ ] 前端构建成功（`pnpm run build`）
- [ ] 环境变量已配置（`JWT_SECRET`）
- [ ] D1 数据库已创建
- [ ] Workers KV 命名空间已创建

### 部署后
- [ ] 健康检查接口正常（`/api/health`）
- [ ] 前端页面加载正常
- [ ] API 接口响应正常
- [ ] 用户注册/登录功能正常
- [ ] 链接 CRUD 功能正常
- [ ] 网站信息抓取功能正常
- [ ] 监控和日志正常

---

*本文档由 Claude Code (系统架构专家) 维护，最后更新: 2026-01-20*
