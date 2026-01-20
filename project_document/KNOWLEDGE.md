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

### ADR-012: 测试数据库初始化 SQL 内联策略
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

---

## 🏗️ 代码模式

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

---

## ❓ 常见问题

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
