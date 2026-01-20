# CF-Nav 部署指南

本文档详细说明如何将 CF-Nav 部署到 Cloudflare。

## 📋 部署前准备

### 1. 注册 Cloudflare 账号

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) 注册账号（完全免费）。

### 2. 安装 Wrangler CLI

```bash
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 3. 准备环境

- Node.js 18+
- npm 或 yarn

---

## 🚀 后端部署（Cloudflare Workers + D1）

### 步骤 1：创建 D1 数据库

```bash
cd backend

# 创建数据库
npx wrangler d1 create cf-nav-db
```

命令执行后会返回：

```toml
[[d1_databases]]
binding = "DB"
database_name = "cf-nav-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**复制 `database_id` 并更新 `backend/wrangler.toml`：**

```toml
[[d1_databases]]
binding = "DB"
database_name = "cf-nav-db"
database_id = "你的database_id"  # 替换这里
```

### 步骤 2：运行数据库迁移

```bash
# 应用所有迁移到生产数据库
npx wrangler d1 migrations apply cf-nav-db --remote
```

验证迁移成功：

```bash
# 查看数据库表
npx wrangler d1 execute cf-nav-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

应该看到：`users`, `categories`, `links` 三个表。

### 步骤 3：配置环境变量

编辑 `backend/wrangler.toml`，添加 JWT 密钥：

```toml
[vars]
JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"
```

**重要**: 生产环境请使用强密钥，例如：

```bash
# 生成随机密钥
openssl rand -base64 32
```

### 步骤 4：部署 Workers

```bash
cd backend

# 安装依赖
npm install

# 部署到 Cloudflare
npm run deploy
```

部署成功后会显示 Workers URL，类似：

```
https://cf-nav-backend.your-subdomain.workers.dev
```

**保存这个 URL，前端需要用到！**

### 步骤 5：初始化管理员账户

使用 curl 或 Postman 创建第一个管理员：

```bash
curl -X POST https://cf-nav-backend.your-subdomain.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123456",
    "email": "admin@example.com"
  }'
```

**建议**: 创建账户后，在 `backend/src/routes/auth.ts` 中注释掉注册接口，防止他人注册。

---

## 🌐 前端部署（Cloudflare Pages）

### 方法 1：通过 Dashboard 手动部署

#### 步骤 1：构建前端

```bash
cd frontend

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env

# 编辑 .env，填入后端 API 地址
# VITE_API_BASE_URL=https://cf-nav-backend.your-subdomain.workers.dev/api
```

编辑 `.env`：

```env
VITE_API_BASE_URL=https://cf-nav-backend.your-subdomain.workers.dev/api
```

构建：

```bash
npm run build
```

#### 步骤 2：上传到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 菜单
3. 点击 **Create a project**
4. 选择 **Upload assets**
5. 上传 `frontend/dist` 目录
6. 项目名称填写 `cf-nav`
7. 点击 **Deploy site**

部署成功后会得到一个 URL：

```
https://cf-nav.pages.dev
```

### 方法 2：通过 Git 自动部署（推荐）

#### 步骤 1：推送代码到 GitHub

```bash
# 初始化 Git 仓库（如果还没有）
git init
git add .
git commit -m "feat: initial commit"

# 创建 GitHub 仓库并推送
git remote add origin https://github.com/your-username/cf-nav.git
git push -u origin master
```

#### 步骤 2：连接 GitHub

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** 菜单
3. 点击 **Create a project**
4. 选择 **Connect to Git**
5. 授权 GitHub 并选择 `cf-nav` 仓库

#### 步骤 3：配置构建设置

- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `frontend`

#### 步骤 4：配置环境变量

在 **Environment variables** 部分添加：

```
VITE_API_BASE_URL = https://cf-nav-backend.your-subdomain.workers.dev/api
```

#### 步骤 5：部署

点击 **Save and Deploy**，Cloudflare Pages 会自动：
1. 克隆代码
2. 安装依赖
3. 构建项目
4. 部署到全球 CDN

以后每次推送到 GitHub，都会自动触发部署！

---

## 🔧 配置自定义域名（可选）

### 后端自定义域名

1. 进入 **Workers** → 选择 `cf-nav-backend`
2. 点击 **Triggers** → **Add Custom Domain**
3. 输入域名（如 `api.yourdomain.com`）
4. Cloudflare 会自动配置 DNS 和 SSL

### 前端自定义域名

1. 进入 **Pages** → 选择 `cf-nav`
2. 点击 **Custom domains** → **Set up a custom domain**
3. 输入域名（如 `nav.yourdomain.com`）
4. 按提示配置 DNS 记录

---

## 🧪 验证部署

### 1. 测试后端 API

```bash
# 健康检查
curl https://cf-nav-backend.your-subdomain.workers.dev/

# API 信息
curl https://cf-nav-backend.your-subdomain.workers.dev/api

# 测试登录
curl -X POST https://cf-nav-backend.your-subdomain.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123456"}'
```

### 2. 测试前端

访问 `https://cf-nav.pages.dev`，应该能看到：
- ✅ 首页加载正常
- ✅ 登录功能可用
- ✅ 管理后台可访问

---

## 📊 监控和日志

### 查看 Workers 日志

```bash
# 实时查看日志
npx wrangler tail cf-nav-backend

# 或在 Dashboard 查看
# Workers → cf-nav-backend → Logs
```

### 查看 Pages 部署历史

在 Cloudflare Dashboard → Pages → cf-nav → Deployments 查看所有部署记录。

---

## 🔄 更新部署

### 更新后端

```bash
cd backend
npm run deploy
```

### 更新前端（Git 自动部署）

```bash
git add .
git commit -m "feat: update feature"
git push
```

Cloudflare Pages 会自动检测到推送并重新部署。

### 更新前端（手动部署）

```bash
cd frontend
npm run build

# 在 Dashboard 上传新的 dist 目录
```

---

## 🛠️ 数据库管理

### 查询数据

```bash
# 查看所有用户
npx wrangler d1 execute cf-nav-db --remote \
  --command "SELECT * FROM users;"

# 查看所有分类
npx wrangler d1 execute cf-nav-db --remote \
  --command "SELECT * FROM categories;"

# 查看所有链接
npx wrangler d1 execute cf-nav-db --remote \
  --command "SELECT * FROM links;"
```

### 备份数据库

```bash
# 导出数据（需要手动执行多次查询）
npx wrangler d1 execute cf-nav-db --remote \
  --command "SELECT * FROM users;" > backup_users.sql

npx wrangler d1 execute cf-nav-db --remote \
  --command "SELECT * FROM categories;" > backup_categories.sql

npx wrangler d1 execute cf-nav-db --remote \
  --command "SELECT * FROM links;" > backup_links.sql
```

### 重置数据库

```bash
# 删除所有数据
npx wrangler d1 execute cf-nav-db --remote \
  --command "DELETE FROM links;"
npx wrangler d1 execute cf-nav-db --remote \
  --command "DELETE FROM categories;"
npx wrangler d1 execute cf-nav-db --remote \
  --command "DELETE FROM users;"
```

---

## ⚠️ 注意事项

### 1. 免费套餐限制

Cloudflare 免费套餐限制：
- **Workers**: 100,000 请求/天
- **D1**: 5GB 存储，每天 500 万行读取
- **Pages**: 无限请求，500 次构建/月

对于个人导航站完全够用！

### 2. 安全建议

- ✅ 使用强 JWT 密钥
- ✅ 创建管理员后禁用注册接口
- ✅ 定期备份数据库
- ✅ 启用 Cloudflare 防火墙规则

### 3. 性能优化

- ✅ 启用 Cloudflare CDN 缓存
- ✅ 使用自定义域名（更快的 DNS 解析）
- ✅ 前端开启 Gzip 压缩

---

## 🆘 常见问题

### Q1: 部署后 API 请求 CORS 错误

**原因**: 前端 `.env` 文件中的 API 地址配置错误。

**解决**:
```env
# 确保 API 地址正确且包含 /api 前缀
VITE_API_BASE_URL=https://your-workers-url.workers.dev/api
```

### Q2: 数据库迁移失败

**原因**: `database_id` 配置错误。

**解决**:
```bash
# 重新创建数据库
npx wrangler d1 create cf-nav-db-new

# 复制新的 database_id 到 wrangler.toml

# 重新运行迁移
npx wrangler d1 migrations apply cf-nav-db-new --remote
```

### Q3: 登录后立即退出

**原因**: JWT 密钥配置不一致。

**解决**:
```toml
# 确保 wrangler.toml 中配置了 JWT_SECRET
[vars]
JWT_SECRET = "your-secret-key"

# 重新部署
npm run deploy
```

---

## 📞 获取帮助

- **GitHub Issues**: https://github.com/your-username/cf-nav/issues
- **Cloudflare 文档**: https://developers.cloudflare.com/
- **社区论坛**: https://community.cloudflare.com/

---

**部署完成！享受你的免费导航站吧！** 🎉
