# CF-Nav - Cloudflare 导航站

> 基于 Cloudflare Workers + D1 + Pages 的轻量级导航网站

## ✨ 特性

- 🚀 **极致性能** - 基于 Cloudflare 全球边缘网络，访问速度快
- 💰 **完全免费** - 利用 Cloudflare 免费套餐，零成本运行
- 🎨 **现代设计** - 采用 Tailwind CSS，响应式布局
- 🔐 **安全可靠** - JWT 认证，密码加密存储
- 📦 **开箱即用** - 简单配置即可部署
- 🔍 **搜索功能** - 支持链接标题和描述搜索
- 📊 **点击统计** - 自动记录链接点击次数
- 🎯 **自动抓取** - 自动获取网站标题、描述、图标

## 🏗️ 技术栈

### 后端
- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Authentication**: JWT + bcrypt

### 前端
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router
- **Icons**: Lucide React

## 📦 项目结构

```
cf-nav/
├── backend/              # 后端 Workers API
│   ├── src/
│   │   ├── db/          # 数据库 Schema
│   │   ├── middleware/  # 中间件（认证、错误处理）
│   │   ├── routes/      # API 路由
│   │   ├── services/    # 业务服务
│   │   ├── utils/       # 工具函数
│   │   └── index.ts     # 入口文件
│   ├── migrations/      # 数据库迁移文件
│   ├── package.json
│   ├── wrangler.toml    # Cloudflare 配置
│   └── tsconfig.json
├── frontend/            # 前端 React 应用
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── pages/       # 页面组件
│   │   ├── services/    # API 服务
│   │   ├── stores/      # 状态管理
│   │   ├── hooks/       # 自定义 Hooks
│   │   ├── types/       # TypeScript 类型
│   │   └── utils/       # 工具函数
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
└── CF-NAV-README.md     # 本文件
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare 账号

### 1. 克隆项目

```bash
git clone https://github.com/your-username/cf-nav.git
cd cf-nav
```

### 2. 后端部署

```bash
cd backend

# 安装依赖
npm install

# 创建 D1 数据库
npx wrangler d1 create cf-nav-db

# 复制返回的 database_id 到 wrangler.toml

# 运行数据库迁移
npx wrangler d1 migrations apply cf-nav-db --remote

# 部署到 Cloudflare Workers
npm run deploy
```

### 3. 前端部署

```bash
cd frontend

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env

# 修改 .env 中的 API 地址为你的 Workers URL

# 构建
npm run build

# 部署到 Cloudflare Pages
# 方法1: 通过 Cloudflare Dashboard 手动上传 dist 目录
# 方法2: 连接 GitHub 仓库自动部署
```

### 4. 初始化管理员账户

访问 `/api/auth/register` 接口创建第一个管理员账户：

```bash
curl -X POST https://your-workers-url.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "email": "admin@example.com"
  }'
```

**重要**: 建议创建账户后禁用注册接口或添加邀请码机制。

## 📖 使用说明

### 管理后台

1. 访问 `/login` 登录管理后台
2. 创建分类和链接
3. 支持拖拽排序、显示隐藏、批量操作

### 前台展示

- 访问首页查看所有可见链接
- 使用搜索框快速查找链接
- 点击链接自动记录统计

## 🔧 开发

### 本地开发 - 后端

```bash
cd backend
npm run dev  # 启动开发服务器（http://localhost:8787）
```

### 本地开发 - 前端

```bash
cd frontend
npm run dev  # 启动开发服务器（http://localhost:3000）
```

前端开发服务器会自动代理 API 请求到后端。

## 🛠️ 配置

### 环境变量

**后端** (`wrangler.toml`):
```toml
[vars]
JWT_SECRET = "your-jwt-secret-key"
```

**前端** (`.env`):
```env
VITE_API_BASE_URL=https://your-workers-url.workers.dev/api
```

### 数据库迁移

```bash
# 创建新迁移
cd backend
npx wrangler d1 migrations create cf-nav-db <migration-name>

# 应用迁移（本地）
npx wrangler d1 migrations apply cf-nav-db --local

# 应用迁移（生产）
npx wrangler d1 migrations apply cf-nav-db --remote
```

## 📝 API 文档

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户信息

### 分类接口

- `GET /api/categories` - 获取分类列表
- `POST /api/categories` - 创建分类（需认证）
- `PUT /api/categories/:id` - 更新分类（需认证）
- `DELETE /api/categories/:id` - 删除分类（需认证）
- `PATCH /api/categories/:id/visibility` - 切换可见性（需认证）

### 链接接口

- `GET /api/links` - 获取链接列表
- `POST /api/links` - 创建链接（需认证）
- `PUT /api/links/:id` - 更新链接（需认证）
- `DELETE /api/links/:id` - 删除链接（需认证）
- `PATCH /api/links/:id/visibility` - 切换可见性（需认证）
- `POST /api/links/:id/click` - 记录点击
- `POST /api/links/parse` - 解析网站信息（需认证）

详细 API 文档请访问 `/api` 端点。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Hono](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
