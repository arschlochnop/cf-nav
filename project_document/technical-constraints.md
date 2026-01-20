# Cloudflare 导航网站 - 技术约束与假设文档

## 📋 文档说明

本文档详细记录了 Cloudflare 导航网站项目的技术约束、架构假设、限制条件和风险评估，用于指导技术选型和架构设计。

---

## 🏗️ 技术栈约束

### 必须使用的技术

#### 1. Cloudflare Pages
**用途**: 前端静态网站托管
**版本**: 最新稳定版
**约束条件**:
- 免费套餐限制：500 次构建/月
- 单次构建时间限制：20 分钟
- 部署大小限制：25 MB（压缩后）
- 支持的框架：React、Vue、Next.js、Nuxt、Svelte、Astro 等

**推荐配置**:
```toml
# wrangler.toml (Pages 配置)
name = "cf-nav"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"
directory = "dist"
```

---

#### 2. Cloudflare Workers
**用途**: 后端 API 和业务逻辑
**版本**: Workers Runtime (最新稳定版)
**约束条件**:
- 免费套餐限制：100,000 次请求/天
- 单次请求 CPU 时间：< 50ms（免费套餐），< 30 秒（付费套餐）
- 内存限制：128 MB
- 脚本大小限制：1 MB（压缩后）
- 环境变量限制：5 KB

**性能约束**:
| 指标 | 免费套餐 | 付费套餐 |
|-----|---------|---------|
| CPU 时间 | 10ms (avg) | 无限制 |
| 每日请求数 | 100,000 | 1000万+ |
| 并发请求 | 1000 | 无限制 |

**推荐配置**:
```toml
# wrangler.toml (Workers 配置)
name = "cf-nav-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }

[[d1_databases]]
binding = "DB"
database_name = "cf-nav-db"
database_id = "<database-id>"
```

---

#### 3. Cloudflare D1 Database
**用途**: 数据持久化存储
**版本**: D1 (SQLite-compatible)
**约束条件**:
- 免费套餐限制：
  - 5 GB 存储空间
  - 500 万行数据读取/天
  - 10 万行数据写入/天
- 单数据库大小限制：500 MB（免费）/ 10 GB（付费）
- 单表行数限制：建议 < 10,000 行（性能考虑）
- 查询超时时间：30 秒
- 不支持：存储过程、触发器、全文搜索

**性能特点**:
- 基于 SQLite，适合读多写少的场景
- 不支持跨数据库查询
- 不支持并发写入（使用行级锁）

**数据库设计约束**:
```sql
-- 示例：用户表设计
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- bcrypt 加密
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引建议
CREATE INDEX idx_users_email ON users(email);
```

---

### 推荐使用的技术

#### 前端框架
**推荐**: React + TypeScript + Vite
**理由**:
- React 生态成熟，组件库丰富
- TypeScript 提供类型安全
- Vite 构建速度快，开发体验好

**替代方案**:
- Vue 3 + TypeScript + Vite
- Next.js (支持 SSG 和 SSR)
- Astro (静态网站生成器，性能极佳)

**技术栈组合**:
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

#### CSS 框架
**推荐**: Tailwind CSS + DaisyUI / Shadcn UI
**理由**:
- Tailwind CSS 提供原子化 CSS，构建灵活
- DaisyUI 提供预设组件，开发效率高
- Shadcn UI 提供高质量的无样式组件

**配置示例**:
```js
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark'],
  },
}
```

---

#### 状态管理
**推荐**: Zustand / TanStack Query
**理由**:
- Zustand 轻量级，API 简洁
- TanStack Query 专注于服务端状态管理（缓存、重试、同步）

**不推荐**: Redux（过于复杂）

---

#### HTTP 客户端
**推荐**: `fetch` API（原生）或 `ky` (轻量级封装)
**理由**:
- Cloudflare Workers 原生支持 `fetch`
- `ky` 提供更好的 API 和错误处理

**示例**:
```typescript
import ky from 'ky';

const api = ky.create({
  prefixUrl: '/api',
  timeout: 10000,
  hooks: {
    beforeRequest: [
      request => {
        const token = localStorage.getItem('token');
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      }
    ]
  }
});
```

---

## 🔒 安全约束

### 1. 密码加密
**约束**: 必须使用 bcrypt 或 Argon2
**参数要求**:
- bcrypt cost factor ≥ 10
- Argon2 推荐参数：
  - Memory: 64 MB
  - Iterations: 3
  - Parallelism: 1

**实现示例**:
```typescript
import bcrypt from 'bcryptjs';

// 注册时加密
const hashedPassword = await bcrypt.hash(password, 10);

// 登录时验证
const isValid = await bcrypt.compare(password, hashedPassword);
```

**依赖库**:
- Workers: `bcryptjs` (纯 JS 实现，无需编译)
- Node.js: `bcrypt` (性能更好)

---

### 2. JWT Token
**约束**: 必须使用 HS256 算法签名
**Token 结构**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 1,
    "email": "user@example.com",
    "exp": 1704067200
  },
  "signature": "..."
}
```

**安全要求**:
- JWT 密钥长度 ≥ 256 位
- 密钥存储在 Cloudflare Workers 环境变量（不可提交到代码仓库）
- Token 过期时间：24 小时（普通登录），30 天（记住我）

**实现示例**:
```typescript
import jwt from '@tsndr/cloudflare-worker-jwt';

// 生成 Token
const token = await jwt.sign({
  user_id: 1,
  email: 'user@example.com',
  exp: Math.floor(Date.now() / 1000) + 86400, // 24 小时
}, env.JWT_SECRET);

// 验证 Token
const isValid = await jwt.verify(token, env.JWT_SECRET);
const payload = jwt.decode(token);
```

**推荐库**: `@tsndr/cloudflare-worker-jwt` (专为 Workers 优化)

---

### 3. SQL 注入防护
**约束**: 所有数据库查询必须使用参数化查询
**禁止**: 字符串拼接 SQL

**正确示例**:
```typescript
// ✅ 正确：使用参数化查询
const result = await env.DB.prepare(
  'SELECT * FROM links WHERE category_id = ?'
).bind(categoryId).all();

// ❌ 错误：字符串拼接
const result = await env.DB.prepare(
  `SELECT * FROM links WHERE category_id = ${categoryId}`
).all();
```

---

### 4. XSS 防护
**约束**: 所有用户输入必须转义
**实现方式**:
- 后端：使用 SQL 参数化查询（自动转义）
- 前端：React 自动转义（JSX）
- 手动拼接 HTML 时使用 `DOMPurify` 库

**示例**:
```typescript
import DOMPurify from 'dompurify';

// 清理用户输入的 HTML
const clean = DOMPurify.sanitize(dirtyHTML);
```

---

### 5. CORS 配置
**约束**: 仅允许特定域名跨域访问
**配置示例**:
```typescript
// Cloudflare Workers CORS 中间件
function handleCORS(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    'https://your-domain.com',
    'http://localhost:3000' // 开发环境
  ];

  if (origin && allowedOrigins.includes(origin)) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
  return null;
}
```

---

### 6. 限流策略
**约束**: 防止暴力破解和 DDoS 攻击
**限流规则**:
| 接口 | 限制 | 时间窗口 |
|-----|------|---------|
| 登录 | 5 次 | 1 分钟 |
| 注册 | 3 次 | 1 小时 |
| API 请求 | 100 次 | 1 分钟 |

**实现方式**: 使用 Cloudflare Workers KV 存储请求计数
**示例**:
```typescript
async function checkRateLimit(ip: string, key: string, limit: number): Promise<boolean> {
  const count = await env.KV.get(`ratelimit:${key}:${ip}`);
  if (count && parseInt(count) >= limit) {
    return false; // 超过限制
  }
  await env.KV.put(`ratelimit:${key}:${ip}`, (parseInt(count || '0') + 1).toString(), {
    expirationTtl: 60, // 1 分钟后过期
  });
  return true;
}
```

---

## 📊 性能约束

### 1. 首页加载性能
**目标**:
- Largest Contentful Paint (LCP) < 2 秒
- First Contentful Paint (FCP) < 1.5 秒
- Time to Interactive (TTI) < 3 秒
- Cumulative Layout Shift (CLS) < 0.1

**优化策略**:
- 使用 Cloudflare CDN 全球加速
- 启用 Brotli 压缩
- 图片懒加载（`loading="lazy"`）
- 代码分割（动态 import）
- 使用 WebP 格式图片

**Lighthouse 配置**:
```json
{
  "extends": "lighthouse:default",
  "settings": {
    "onlyCategories": ["performance", "accessibility", "best-practices", "seo"]
  }
}
```

---

### 2. API 响应时间
**目标**:
- P50: < 200ms
- P95: < 500ms
- P99: < 1000ms

**优化策略**:
- 数据库查询优化（添加索引）
- 使用 Cloudflare Workers KV 缓存热点数据
- 减少不必要的联表查询

**缓存策略**:
```typescript
// 缓存网站信息抓取结果
const cacheKey = `fetch:${url}`;
const cached = await env.KV.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}
const result = await fetchWebsiteInfo(url);
await env.KV.put(cacheKey, JSON.stringify(result), {
  expirationTtl: 86400, // 24 小时
});
return result;
```

---

### 3. 数据库性能
**约束**:
- 单表行数 < 10,000（建议）
- 避免复杂的联表查询（使用应用层聚合）
- 为常用查询字段添加索引

**索引设计**:
```sql
-- 用户表
CREATE INDEX idx_users_email ON users(email);

-- 链接表
CREATE INDEX idx_links_category_id ON links(category_id);
CREATE INDEX idx_links_order ON links(order);

-- 分类表
CREATE INDEX idx_categories_order ON categories(order);
```

**查询优化示例**:
```typescript
// ❌ 避免：复杂联表查询
SELECT links.*, categories.name FROM links
JOIN categories ON links.category_id = categories.id
WHERE categories.name = 'dev-tools';

// ✅ 推荐：先查分类 ID，再查链接
const category = await env.DB.prepare(
  'SELECT id FROM categories WHERE name = ?'
).bind('dev-tools').first();

const links = await env.DB.prepare(
  'SELECT * FROM links WHERE category_id = ?'
).bind(category.id).all();
```

---

## 🌐 Cloudflare 服务限制

### 1. Pages 限制
| 项目 | 免费套餐 | 付费套餐 |
|-----|---------|---------|
| 构建次数 | 500/月 | 5000/月 |
| 并发构建 | 1 | 5 |
| 构建时间 | 20 分钟 | 20 分钟 |
| 部署大小 | 25 MB | 25 MB |
| 自定义域名 | 100 | 500 |

**影响**:
- 需要控制前端打包大小（< 25 MB）
- 需要优化构建速度（< 20 分钟）

---

### 2. Workers 限制
| 项目 | 免费套餐 | 付费套餐 |
|-----|---------|---------|
| 每日请求数 | 100,000 | 1000 万+ |
| CPU 时间 | 10ms (avg) | 50ms (avg) |
| 脚本大小 | 1 MB | 10 MB |
| 环境变量 | 5 KB | 5 KB |

**影响**:
- 需要优化 Workers 脚本大小（< 1 MB）
- 需要控制单次请求 CPU 时间（< 10ms）

---

### 3. D1 限制
| 项目 | 免费套餐 | 付费套餐 |
|-----|---------|---------|
| 存储空间 | 5 GB | 无限制 |
| 读取行数 | 500 万/天 | 2500 万/天 |
| 写入行数 | 10 万/天 | 50 万/天 |
| 数据库数量 | 10 | 50000 |

**影响**:
- 需要控制链接数量（< 500 个，确保在读取限制内）
- 需要控制写入频率（使用批量操作）

---

### 4. Workers KV 限制
| 项目 | 免费套餐 | 付费套餐 |
|-----|---------|---------|
| 读取次数 | 100,000/天 | 1000 万/天 |
| 写入次数 | 1,000/天 | 100 万/天 |
| 存储空间 | 1 GB | 无限制 |
| 键值对数量 | 100,000 | 无限制 |

**影响**:
- KV 适合读多写少的缓存场景
- 不适合频繁更新的数据

---

## 🔧 开发环境约束

### 1. Node.js 版本
**要求**: Node.js >= 18.0.0
**推荐**: Node.js 20.x (LTS)

**验证命令**:
```bash
node --version
# 输出: v20.10.0
```

---

### 2. 包管理器
**推荐**: pnpm (速度快，节省磁盘空间)
**替代方案**: npm, yarn

**安装命令**:
```bash
npm install -g pnpm
```

---

### 3. Wrangler CLI
**用途**: Cloudflare 官方命令行工具
**版本**: >= 3.0.0

**安装命令**:
```bash
npm install -g wrangler
```

**认证**:
```bash
wrangler login
```

---

### 4. 代码质量工具
**必须使用**:
- ESLint (代码规范检查)
- Prettier (代码格式化)
- TypeScript (类型检查)

**配置示例**:
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

---

## 📦 数据库设计约束

### 表结构设计规范

#### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- bcrypt 加密
    nickname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**约束**:
- 邮箱必须唯一
- 密码必须加密存储
- 包含时间戳字段

---

#### 2. 链接表 (links)
```sql
CREATE TABLE links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    favicon TEXT, -- favicon URL
    logo TEXT, -- logo URL
    category_id INTEGER NOT NULL DEFAULT 0,
    order_num INTEGER DEFAULT 0, -- 排序字段
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET DEFAULT
);

CREATE INDEX idx_links_category_id ON links(category_id);
CREATE INDEX idx_links_order ON links(order_num);
CREATE UNIQUE INDEX idx_links_url ON links(url);
```

**约束**:
- URL 必须唯一
- category_id 外键关联 categories 表
- 删除分类时，链接的 category_id 设置为 0（默认分类）

---

#### 3. 分类表 (categories)
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT, -- 图标名称（如 'code', 'book'）
    color TEXT, -- 颜色代码（如 '#3B82F6'）
    order_num INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认分类
INSERT INTO categories (id, name, icon, color, order_num)
VALUES (0, '默认分类', 'folder', '#6B7280', 0);

CREATE INDEX idx_categories_order ON categories(order_num);
CREATE UNIQUE INDEX idx_categories_name ON categories(name);
```

**约束**:
- 分类名称必须唯一
- ID=0 为默认分类，不可删除
- 最多 20 个分类

---

### 数据迁移策略
**工具**: Wrangler D1 Migrations
**目录结构**:
```
migrations/
├── 0001_create_users_table.sql
├── 0002_create_categories_table.sql
├── 0003_create_links_table.sql
└── 0004_seed_default_data.sql
```

**执行命令**:
```bash
# 本地执行迁移
wrangler d1 migrations apply cf-nav-db --local

# 生产环境执行迁移
wrangler d1 migrations apply cf-nav-db --remote
```

---

## 🚀 部署约束

### 1. 环境变量
**必须配置**:
- `JWT_SECRET`: JWT 签名密钥（256 位随机字符串）
- `DATABASE_ID`: D1 数据库 ID

**可选配置**:
- `ENVIRONMENT`: 运行环境（development / production）
- `LOG_LEVEL`: 日志级别（debug / info / error）

**配置方式**:
```bash
# 通过 wrangler.toml
[env.production.vars]
ENVIRONMENT = "production"

# 通过 Cloudflare Dashboard（敏感信息）
wrangler secret put JWT_SECRET
```

---

### 2. 部署流程
**推荐使用 GitHub Actions**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=cf-nav
```

---

### 3. 部署前检查清单
- [ ] 前端构建无错误（`npm run build`）
- [ ] TypeScript 编译通过（`tsc --noEmit`）
- [ ] ESLint 检查通过（`npm run lint`）
- [ ] 单元测试通过（`npm run test`）
- [ ] 环境变量已配置
- [ ] 数据库迁移已执行
- [ ] API 接口已测试

---

## 🔍 假设与依赖

### 技术假设
1. **Cloudflare 服务可用性**: 假设 Cloudflare 提供 99.9% 以上的 SLA
2. **浏览器支持**: 假设用户使用现代浏览器（Chrome, Firefox, Safari, Edge 最新版本）
3. **网络环境**: 假设用户有稳定的互联网连接
4. **JavaScript 启用**: 假设用户浏览器启用 JavaScript

### 业务假设
1. **单管理员模式**: 初期仅支持单管理员，避免复杂的权限管理
2. **链接数量限制**: 假设链接数量 < 500 个（确保性能）
3. **分类数量限制**: 假设分类数量 < 20 个
4. **目标网站可访问**: 假设添加的链接指向的网站可公开访问

### 外部依赖
1. **NPM 包管理器**: 依赖 npm 仓库正常访问
2. **Cloudflare API**: 依赖 Cloudflare API 稳定运行
3. **目标网站服务**: 依赖目标网站允许抓取信息（无严格反爬虫机制）

---

## ⚠️ 风险评估

| 风险 | 影响 | 可能性 | 缓解措施 | 优先级 |
|-----|------|-------|---------|--------|
| Cloudflare 免费套餐限制 | 高 | 中 | 监控使用量，提供升级指导 | P0 |
| D1 数据库性能瓶颈 | 中 | 低 | 限制链接数量，优化查询 | P1 |
| 网站信息抓取失败 | 低 | 高 | 提供手动输入，使用默认图标 | P2 |
| 部署失败 | 高 | 中 | 详细文档，自动回滚机制 | P0 |
| 安全漏洞 | 高 | 低 | 代码审计，安全测试 | P0 |
| 浏览器兼容性问题 | 中 | 低 | 测试主流浏览器，提供降级方案 | P1 |
| Workers CPU 超时 | 中 | 中 | 优化代码逻辑，使用异步处理 | P1 |
| 数据库迁移失败 | 高 | 低 | 提供回滚脚本，测试环境验证 | P0 |

---

## 🛡️ 合规性约束

### GDPR（欧盟通用数据保护条例）
**适用条件**: 如果面向欧盟用户
**要求**:
- [ ] 提供隐私政策页面
- [ ] 用户可删除账号和数据
- [ ] 数据存储位置透明（Cloudflare 数据中心）
- [ ] Cookie 使用需用户同意

---

### CCPA（加州消费者隐私法案）
**适用条件**: 如果面向美国加州用户
**要求**:
- [ ] 提供隐私政策页面
- [ ] 用户可删除个人数据
- [ ] 数据不出售给第三方

---

## 📚 参考资料

### Cloudflare 官方文档
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers KV 文档](https://developers.cloudflare.com/kv/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

### 技术规范
- [JWT 标准 (RFC 7519)](https://datatracker.ietf.org/doc/html/rfc7519)
- [WCAG 2.1 可访问性标准](https://www.w3.org/WAI/WCAG21/quickref/)
- [OWASP Top 10 安全风险](https://owasp.org/www-project-top-ten/)

### 最佳实践
- [React 最佳实践](https://react.dev/learn/thinking-in-react)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [SQLite 性能优化](https://www.sqlite.org/optoverview.html)

---

## 📝 文档版本

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| 1.0 | 2026-01-20 | Claude (需求分析专家) | 初始版本 |

---

**文档状态**: ✅ 已完成
**相关文档**:
- [需求文档](./requirements.md)
- [用户故事](./user-stories.md)
- [验收标准](./acceptance-criteria.md)
