# Cloudflare 导航网站 - API 接口规范

## 📋 文档说明

本文档基于 **OpenAPI 3.0** 标准定义 CF-Nav 导航网站的所有 API 接口，包括请求格式、响应格式、错误处理、认证机制和限流策略。

**文档版本**: 1.0
**API 版本**: v1
**Base URL**: `https://your-domain.com/api/v1`

---

## 🌐 服务器配置

```yaml
servers:
  - url: https://your-domain.com/api/v1
    description: 生产环境
  - url: https://staging.your-domain.com/api/v1
    description: 预发布环境
  - url: http://localhost:8787/api/v1
    description: 本地开发环境
```

---

## 🔐 认证机制

### JWT Bearer Token

**格式**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Token 结构**:
```json
{
  "user_id": 1,
  "email": "admin@example.com",
  "iat": 1704067200,
  "exp": 1704153600
}
```

**获取方式**:
通过 `POST /api/v1/auth/login` 接口获取

**过期时间**:
- 普通登录: 24 小时
- 记住我: 30 天

**受保护的 API**:
所有 `/api/v1/admin/*` 路径下的接口需要 Bearer Token

---

## 📦 通用响应格式

### 成功响应 (2xx)

```json
{
  "success": true,
  "data": {
    // 实际数据
  },
  "message": "操作成功",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

### 错误响应 (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式无效"
      }
    ]
  },
  "timestamp": "2026-01-20T10:30:00Z"
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-01-20T10:30:00Z"
}
```

---

## 🛤️ API 端点

### 1. 认证模块

#### 1.1 用户注册

**端点**: `POST /api/v1/auth/register`
**认证**: 无需认证
**限流**: 3 次/小时 (每 IP)

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "nickname": "张三"
}
```

**请求 Schema**:
```typescript
{
  email: string;      // 必填，邮箱格式
  password: string;   // 必填，8-64 位，包含字母和数字
  nickname?: string;  // 可选，1-20 位
}
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "张三",
    "created_at": "2026-01-20T10:30:00Z"
  },
  "message": "注册成功",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 409 | `EMAIL_EXISTS` | 邮箱已被注册 |
| 429 | `RATE_LIMIT_EXCEEDED` | 超过注册频率限制 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

**示例错误**:
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "该邮箱已被注册",
    "details": null
  },
  "timestamp": "2026-01-20T10:30:00Z"
}
```

---

#### 1.2 用户登录

**端点**: `POST /api/v1/auth/login`
**认证**: 无需认证
**限流**: 5 次/分钟 (每 IP)

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "remember_me": false
}
```

**请求 Schema**:
```typescript
{
  email: string;       // 必填，邮箱格式
  password: string;    // 必填
  remember_me?: boolean; // 可选，默认 false
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "nickname": "张三"
    },
    "expires_at": "2026-01-21T10:30:00Z"
  },
  "message": "登录成功",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `INVALID_CREDENTIALS` | 邮箱或密码错误 |
| 423 | `ACCOUNT_LOCKED` | 账号已被锁定（连续失败 5 次） |
| 429 | `RATE_LIMIT_EXCEEDED` | 超过登录频率限制 |

---

#### 1.3 获取当前用户信息

**端点**: `GET /api/v1/auth/me`
**认证**: 需要 Bearer Token
**限流**: 100 次/分钟

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "张三",
    "created_at": "2026-01-10T10:30:00Z",
    "updated_at": "2026-01-20T10:30:00Z"
  },
  "message": "获取成功",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 404 | `USER_NOT_FOUND` | 用户不存在 |

---

### 2. 链接管理模块

#### 2.1 获取所有链接

**端点**: `GET /api/v1/links`
**认证**: 无需认证（公开 API）
**限流**: 1000 次/小时 (每 IP)

**查询参数**:
```
?category_id=1&page=1&limit=20&sort=order_num&order=asc
```

**参数 Schema**:
```typescript
{
  category_id?: number; // 可选，分类 ID (0 表示所有分类)
  page?: number;        // 可选，页码，默认 1
  limit?: number;       // 可选，每页数量，默认 20，最大 100
  sort?: string;        // 可选，排序字段，可选值: order_num, created_at, title
  order?: 'asc' | 'desc'; // 可选，排序方向，默认 asc
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://github.com",
      "title": "GitHub",
      "description": "全球最大的代码托管平台",
      "favicon": "https://github.com/favicon.ico",
      "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      "category_id": 1,
      "order_num": 0,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**缓存策略**:
- 缓存位置: Workers KV
- TTL: 5 分钟
- Cache-Control: `public, max-age=300`

---

#### 2.2 获取单个链接

**端点**: `GET /api/v1/links/:id`
**认证**: 无需认证
**限流**: 1000 次/小时

**路径参数**:
- `id`: 链接 ID (整数)

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://github.com",
    "title": "GitHub",
    "description": "全球最大的代码托管平台",
    "favicon": "https://github.com/favicon.ico",
    "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    "category_id": 1,
    "order_num": 0,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-20T10:30:00Z"
  },
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 404 | `LINK_NOT_FOUND` | 链接不存在 |

---

#### 2.3 创建链接 (需要认证)

**端点**: `POST /api/v1/admin/links`
**认证**: 需要 Bearer Token
**限流**: 100 次/小时

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**请求体**:
```json
{
  "url": "https://github.com",
  "title": "GitHub",
  "description": "全球最大的代码托管平台",
  "favicon": "https://github.com/favicon.ico",
  "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
  "category_id": 1,
  "order_num": 0
}
```

**请求 Schema**:
```typescript
{
  url: string;          // 必填，URL 格式，唯一
  title: string;        // 必填，1-100 位
  description?: string; // 可选，最大 500 位
  favicon?: string;     // 可选，URL 格式
  logo?: string;        // 可选，URL 格式
  category_id?: number; // 可选，默认 0（默认分类）
  order_num?: number;   // 可选，默认 0
}
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://github.com",
    "title": "GitHub",
    "description": "全球最大的代码托管平台",
    "favicon": "https://github.com/favicon.ico",
    "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    "category_id": 1,
    "order_num": 0,
    "created_at": "2026-01-20T10:30:00Z",
    "updated_at": "2026-01-20T10:30:00Z"
  },
  "message": "链接创建成功",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 409 | `URL_EXISTS` | URL 已存在 |

**副作用**:
- 清除 Workers KV 缓存 (`cache:links:all`)

---

#### 2.4 更新链接 (需要认证)

**端点**: `PUT /api/v1/admin/links/:id`
**认证**: 需要 Bearer Token
**限流**: 100 次/小时

**路径参数**:
- `id`: 链接 ID (整数)

**请求体**:
```json
{
  "url": "https://github.com",
  "title": "GitHub - 新标题",
  "description": "更新后的描述",
  "favicon": "https://github.com/favicon.ico",
  "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
  "category_id": 2,
  "order_num": 5
}
```

**请求 Schema**:
```typescript
{
  url?: string;         // 可选，URL 格式
  title?: string;       // 可选，1-100 位
  description?: string; // 可选，最大 500 位
  favicon?: string;     // 可选，URL 格式
  logo?: string;        // 可选，URL 格式
  category_id?: number; // 可选
  order_num?: number;   // 可选
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://github.com",
    "title": "GitHub - 新标题",
    "description": "更新后的描述",
    "favicon": "https://github.com/favicon.ico",
    "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    "category_id": 2,
    "order_num": 5,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-20T10:35:00Z"
  },
  "message": "链接更新成功",
  "timestamp": "2026-01-20T10:35:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 404 | `LINK_NOT_FOUND` | 链接不存在 |
| 409 | `URL_EXISTS` | URL 已存在（更新为其他链接的 URL） |

**副作用**:
- 清除 Workers KV 缓存
- 更新 `updated_at` 字段

---

#### 2.5 删除链接 (需要认证)

**端点**: `DELETE /api/v1/admin/links/:id`
**认证**: 需要 Bearer Token
**限流**: 100 次/小时

**路径参数**:
- `id`: 链接 ID (整数)

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "链接删除成功",
  "timestamp": "2026-01-20T10:40:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 404 | `LINK_NOT_FOUND` | 链接不存在 |

**副作用**:
- 从数据库物理删除链接
- 清除 Workers KV 缓存

---

#### 2.6 批量删除链接 (需要认证)

**端点**: `DELETE /api/v1/admin/links`
**认证**: 需要 Bearer Token
**限流**: 50 次/小时

**请求体**:
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**请求 Schema**:
```typescript
{
  ids: number[]; // 必填，链接 ID 数组，最多 100 个
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "deleted": 5,
    "failed": 0
  },
  "message": "批量删除成功",
  "timestamp": "2026-01-20T10:45:00Z"
}
```

**部分失败响应** (207 Multi-Status):
```json
{
  "success": true,
  "data": {
    "deleted": 3,
    "failed": 2,
    "errors": [
      {
        "id": 4,
        "error": "链接不存在"
      },
      {
        "id": 5,
        "error": "链接不存在"
      }
    ]
  },
  "message": "批量删除部分成功",
  "timestamp": "2026-01-20T10:45:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |

**副作用**:
- 批量删除链接（单个事务）
- 清除 Workers KV 缓存

---

### 3. 分类管理模块

#### 3.1 获取所有分类

**端点**: `GET /api/v1/categories`
**认证**: 无需认证
**限流**: 1000 次/小时

**查询参数**:
```
?include_count=true
```

**参数 Schema**:
```typescript
{
  include_count?: boolean; // 可选，是否包含每个分类的链接数量，默认 false
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 0,
      "name": "默认分类",
      "icon": "folder",
      "color": "#6B7280",
      "order_num": 0,
      "link_count": 50,
      "created_at": "2026-01-10T10:30:00Z",
      "updated_at": "2026-01-20T10:30:00Z"
    },
    {
      "id": 1,
      "name": "开发工具",
      "icon": "code",
      "color": "#3B82F6",
      "order_num": 1,
      "link_count": 30,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T10:30:00Z"
    }
  ],
  "timestamp": "2026-01-20T10:30:00Z"
}
```

**缓存策略**:
- 缓存位置: Workers KV
- TTL: 10 分钟
- Cache-Control: `public, max-age=600`

---

#### 3.2 创建分类 (需要认证)

**端点**: `POST /api/v1/admin/categories`
**认证**: 需要 Bearer Token
**限流**: 50 次/小时

**请求体**:
```json
{
  "name": "开发工具",
  "icon": "code",
  "color": "#3B82F6",
  "order_num": 1
}
```

**请求 Schema**:
```typescript
{
  name: string;      // 必填，1-50 位，唯一
  icon?: string;     // 可选，Lucide 图标名称
  color?: string;    // 可选，颜色代码 (#RRGGBB)
  order_num?: number; // 可选，默认 0
}
```

**成功响应** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "开发工具",
    "icon": "code",
    "color": "#3B82F6",
    "order_num": 1,
    "created_at": "2026-01-20T10:50:00Z",
    "updated_at": "2026-01-20T10:50:00Z"
  },
  "message": "分类创建成功",
  "timestamp": "2026-01-20T10:50:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 409 | `CATEGORY_NAME_EXISTS` | 分类名称已存在 |
| 422 | `CATEGORY_LIMIT_EXCEEDED` | 分类数量超过限制（最多 20 个） |

**副作用**:
- 清除 Workers KV 缓存 (`cache:categories:all`)

---

#### 3.3 更新分类 (需要认证)

**端点**: `PUT /api/v1/admin/categories/:id`
**认证**: 需要 Bearer Token
**限流**: 100 次/小时

**路径参数**:
- `id`: 分类 ID (整数)

**请求体**:
```json
{
  "name": "开发工具 - 新名称",
  "icon": "terminal",
  "color": "#10B981",
  "order_num": 2
}
```

**请求 Schema**:
```typescript
{
  name?: string;      // 可选，1-50 位
  icon?: string;      // 可选，Lucide 图标名称
  color?: string;     // 可选，颜色代码
  order_num?: number; // 可选
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "开发工具 - 新名称",
    "icon": "terminal",
    "color": "#10B981",
    "order_num": 2,
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-20T10:55:00Z"
  },
  "message": "分类更新成功",
  "timestamp": "2026-01-20T10:55:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 403 | `FORBIDDEN` | 无法修改默认分类（ID=0） |
| 404 | `CATEGORY_NOT_FOUND` | 分类不存在 |
| 409 | `CATEGORY_NAME_EXISTS` | 分类名称已存在 |

---

#### 3.4 删除分类 (需要认证)

**端点**: `DELETE /api/v1/admin/categories/:id`
**认证**: 需要 Bearer Token
**限流**: 50 次/小时

**路径参数**:
- `id`: 分类 ID (整数)

**查询参数**:
```
?action=move_to_default
```

**参数 Schema**:
```typescript
{
  action: 'delete_links' | 'move_to_default'; // 必填
  // delete_links: 删除分类及所有链接
  // move_to_default: 仅删除分类，链接移至默认分类
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "deleted_category_id": 1,
    "deleted_links": 0,
    "moved_links": 30
  },
  "message": "分类删除成功，30 个链接已移至默认分类",
  "timestamp": "2026-01-20T11:00:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 403 | `FORBIDDEN` | 无法删除默认分类（ID=0） |
| 404 | `CATEGORY_NOT_FOUND` | 分类不存在 |

**副作用**:
- 删除分类
- 根据 `action` 参数删除或移动链接
- 清除 Workers KV 缓存

---

### 4. 网站信息抓取模块

#### 4.1 抓取网站信息

**端点**: `POST /api/v1/scrape`
**认证**: 需要 Bearer Token（防止滥用）
**限流**: 20 次/小时

**请求体**:
```json
{
  "url": "https://github.com"
}
```

**请求 Schema**:
```typescript
{
  url: string; // 必填，URL 格式
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "url": "https://github.com",
    "title": "GitHub: Let's build from here",
    "description": "GitHub is where over 100 million developers shape the future of software, together.",
    "favicon": "https://github.com/favicon.ico",
    "logo": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
  },
  "message": "抓取成功",
  "timestamp": "2026-01-20T11:05:00Z"
}
```

**部分成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Example Domain",
    "description": null,
    "favicon": null,
    "logo": null
  },
  "message": "抓取部分成功（部分信息未找到）",
  "timestamp": "2026-01-20T11:05:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | URL 格式无效 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 408 | `SCRAPE_TIMEOUT` | 抓取超时（10 秒） |
| 422 | `SCRAPE_FAILED` | 无法访问目标网站 |
| 429 | `RATE_LIMIT_EXCEEDED` | 超过抓取频率限制 |

**缓存策略**:
- 缓存位置: Workers KV
- TTL: 24 小时
- Cache Key: `scrape:{url_hash}`

---

### 5. 用户管理模块

#### 5.1 更新用户信息 (需要认证)

**端点**: `PUT /api/v1/admin/user`
**认证**: 需要 Bearer Token
**限流**: 50 次/小时

**请求体**:
```json
{
  "nickname": "李四",
  "email": "newemail@example.com"
}
```

**请求 Schema**:
```typescript
{
  nickname?: string; // 可选，1-20 位
  email?: string;    // 可选，邮箱格式，唯一
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "newemail@example.com",
    "nickname": "李四",
    "created_at": "2026-01-10T10:30:00Z",
    "updated_at": "2026-01-20T11:10:00Z"
  },
  "message": "用户信息更新成功",
  "timestamp": "2026-01-20T11:10:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |
| 409 | `EMAIL_EXISTS` | 邮箱已被使用 |

---

#### 5.2 修改密码 (需要认证)

**端点**: `PUT /api/v1/admin/password`
**认证**: 需要 Bearer Token
**限流**: 10 次/小时

**请求体**:
```json
{
  "old_password": "OldSecurePass123",
  "new_password": "NewSecurePass456"
}
```

**请求 Schema**:
```typescript
{
  old_password: string; // 必填
  new_password: string; // 必填，8-64 位，包含字母和数字
}
```

**成功响应** (200 OK):
```json
{
  "success": true,
  "data": null,
  "message": "密码修改成功，请重新登录",
  "timestamp": "2026-01-20T11:15:00Z"
}
```

**错误响应**:

| 状态码 | 错误码 | 描述 |
|-------|-------|------|
| 400 | `VALIDATION_ERROR` | 请求参数验证失败 |
| 401 | `INVALID_PASSWORD` | 旧密码错误 |
| 401 | `UNAUTHORIZED` | Token 无效或已过期 |

**副作用**:
- 密码修改后，当前 Token 立即失效
- 用户需要重新登录

---

### 6. 系统模块

#### 6.1 健康检查

**端点**: `GET /api/health`
**认证**: 无需认证
**限流**: 无限制

**成功响应** (200 OK):
```json
{
  "status": "healthy",
  "database": "ok",
  "kv": "ok",
  "timestamp": "2026-01-20T11:20:00Z",
  "version": "1.0.0"
}
```

**错误响应** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "database": "error",
  "kv": "ok",
  "timestamp": "2026-01-20T11:20:00Z",
  "version": "1.0.0"
}
```

---

## 🚨 错误码定义

| 错误码 | HTTP 状态码 | 描述 | 解决方案 |
|-------|------------|------|---------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 | 检查请求参数格式 |
| `UNAUTHORIZED` | 401 | Token 无效或已过期 | 重新登录获取 Token |
| `INVALID_CREDENTIALS` | 401 | 邮箱或密码错误 | 检查登录凭据 |
| `FORBIDDEN` | 403 | 无权限执行操作 | 检查用户权限 |
| `LINK_NOT_FOUND` | 404 | 链接不存在 | 检查链接 ID |
| `CATEGORY_NOT_FOUND` | 404 | 分类不存在 | 检查分类 ID |
| `USER_NOT_FOUND` | 404 | 用户不存在 | 检查用户 ID |
| `SCRAPE_TIMEOUT` | 408 | 抓取超时 | 重试或手动输入 |
| `EMAIL_EXISTS` | 409 | 邮箱已被注册 | 使用其他邮箱 |
| `URL_EXISTS` | 409 | URL 已存在 | 检查是否重复添加 |
| `CATEGORY_NAME_EXISTS` | 409 | 分类名称已存在 | 使用其他名称 |
| `CATEGORY_LIMIT_EXCEEDED` | 422 | 分类数量超过限制 | 删除不需要的分类 |
| `SCRAPE_FAILED` | 422 | 抓取失败 | 手动输入信息 |
| `ACCOUNT_LOCKED` | 423 | 账号已被锁定 | 15 分钟后重试 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超过频率限制 | 稍后重试 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | 联系管理员 |

---

## 🔄 限流策略

### 全局限流

| 路径 | 限制 | 时间窗口 | 存储方式 |
|-----|------|---------|---------|
| `/api/v1/auth/login` | 5 次 | 1 分钟 | Workers KV |
| `/api/v1/auth/register` | 3 次 | 1 小时 | Workers KV |
| `/api/v1/scrape` | 20 次 | 1 小时 | Workers KV |
| `/api/v1/admin/*` | 100 次 | 1 分钟 | Workers KV |
| `/api/v1/*` (所有 API) | 1000 次 | 1 小时 | Cloudflare Rate Limiting |

### 限流响应头

**请求成功时**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067800
```

**超过限流时** (429 Too Many Requests):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请稍后重试",
    "details": {
      "retry_after": 60
    }
  },
  "timestamp": "2026-01-20T11:25:00Z"
}
```

**响应头**:
```
Retry-After: 60
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067860
```

---

## 📦 数据模型 (TypeScript Schemas)

### User
```typescript
interface User {
  id: number;
  email: string;
  password: string; // bcrypt 加密
  nickname: string | null;
  created_at: string; // ISO 8601 格式
  updated_at: string;
}
```

### Category
```typescript
interface Category {
  id: number;
  name: string;
  icon: string | null; // Lucide 图标名称
  color: string | null; // #RRGGBB
  order_num: number;
  link_count?: number; // 可选，仅在 include_count=true 时返回
  created_at: string;
  updated_at: string;
}
```

### Link
```typescript
interface Link {
  id: number;
  url: string;
  title: string;
  description: string | null;
  favicon: string | null;
  logo: string | null;
  category_id: number;
  order_num: number;
  created_at: string;
  updated_at: string;
}
```

### ScrapeResult
```typescript
interface ScrapeResult {
  url: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  logo: string | null;
}
```

---

## 🔐 安全最佳实践

### 1. HTTPS 强制
所有 API 请求必须通过 HTTPS，HTTP 请求自动重定向到 HTTPS。

### 2. CORS 配置
仅允许特定域名跨域访问:
```
Access-Control-Allow-Origin: https://your-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 3. Content-Security-Policy
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
```

### 4. 输入验证
所有用户输入必须经过验证:
- 使用 Zod 进行 Schema 验证
- 邮箱格式验证
- URL 格式验证
- 密码强度验证

### 5. SQL 注入防护
所有数据库查询使用参数化查询:
```typescript
// ✅ 正确
db.prepare('SELECT * FROM links WHERE id = ?').bind(id).all()

// ❌ 错误
db.prepare(`SELECT * FROM links WHERE id = ${id}`).all()
```

---

## 📝 API 版本管理

### 版本控制策略
- **URL 路径版本控制**: `/api/v1/`, `/api/v2/`
- **向后兼容**: v1 API 长期支持，废弃前至少提前 6 个月通知
- **版本废弃通知**: 通过响应头 `Deprecation: true` 和 `Sunset: 2027-01-01`

### 版本升级计划

| 版本 | 发布日期 | 废弃日期 | 主要变更 |
|-----|---------|---------|---------|
| v1 | 2026-01-20 | - | 初始版本 |
| v2 | 计划中 | - | 增加链接统计功能 |

---

## 📄 OpenAPI 3.0 完整规范

```yaml
openapi: 3.0.3
info:
  title: CF-Nav API
  version: 1.0.0
  description: Cloudflare 导航网站 RESTful API
  contact:
    name: API Support
    email: support@your-domain.com

servers:
  - url: https://your-domain.com/api/v1
    description: 生产环境
  - url: http://localhost:8787/api/v1
    description: 本地开发环境

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        email:
          type: string
          format: email
        nickname:
          type: string
          nullable: true
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    Link:
      type: object
      properties:
        id:
          type: integer
        url:
          type: string
          format: uri
        title:
          type: string
        description:
          type: string
          nullable: true
        favicon:
          type: string
          format: uri
          nullable: true
        logo:
          type: string
          format: uri
          nullable: true
        category_id:
          type: integer
        order_num:
          type: integer
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    Category:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        icon:
          type: string
          nullable: true
        color:
          type: string
          pattern: '^#[0-9A-Fa-f]{6}$'
          nullable: true
        order_num:
          type: integer
        link_count:
          type: integer
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
              nullable: true
        timestamp:
          type: string
          format: date-time

paths:
  /auth/register:
    post:
      summary: 用户注册
      tags:
        - 认证
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
                  maxLength: 64
                nickname:
                  type: string
                  maxLength: 20
      responses:
        '201':
          description: 注册成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/User'
        '400':
          description: 请求参数错误
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /auth/login:
    post:
      summary: 用户登录
      tags:
        - 认证
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                remember_me:
                  type: boolean
                  default: false
      responses:
        '200':
          description: 登录成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      token:
                        type: string
                      user:
                        $ref: '#/components/schemas/User'
                      expires_at:
                        type: string
                        format: date-time

  /links:
    get:
      summary: 获取所有链接
      tags:
        - 链接
      parameters:
        - name: category_id
          in: query
          schema:
            type: integer
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Link'
                  pagination:
                    type: object
                    properties:
                      page:
                        type: integer
                      limit:
                        type: integer
                      total:
                        type: integer
                      totalPages:
                        type: integer

  /admin/links:
    post:
      summary: 创建链接
      tags:
        - 链接管理
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - url
                - title
              properties:
                url:
                  type: string
                  format: uri
                title:
                  type: string
                description:
                  type: string
                favicon:
                  type: string
                  format: uri
                logo:
                  type: string
                  format: uri
                category_id:
                  type: integer
                order_num:
                  type: integer
      responses:
        '201':
          description: 创建成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/Link'
```

---

## 📝 文档版本

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| 1.0 | 2026-01-20 | Claude (系统架构专家) | 初始版本，完整 API 规范 |

---

**文档状态**: ✅ 已完成
**相关文档**:
- [系统架构](./architecture.md)
- [数据库设计](./database-schema.md)
- [技术栈决策](./tech-stack.md)

**下一步行动**: 创建数据库设计文档 (database-schema.md)
