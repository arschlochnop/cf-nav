import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import auth from './routes/auth';
import categoriesRouter from './routes/categories';
import linksRouter from './routes/links';
import monitorRouter from './routes/monitor';

/**
 * 环境变量类型定义
 */
type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
};

/**
 * Context Variables 类型定义（用于中间件传递数据）
 */
type Variables = {
  user?: {
    userId: number;
    username: string;
  };
};

/**
 * 创建 Hono 应用实例
 */
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * 全局中间件配置
 */

// 日志中间件（开发环境）
app.use('*', logger());

// CORS 配置（允许前端跨域访问）
// 从环境变量读取允许的域名列表，多个域名用逗号分隔
app.use('*', async (c, next) => {
  // 从 Cloudflare Workers 环境变量读取允许的域名
  const allowedOriginsEnv = c.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  const origin = c.req.header('Origin');

  // 检查请求来源是否在白名单中
  if (origin && allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // 无 origin 的请求（例如服务器端请求）允许
    c.header('Access-Control-Allow-Origin', '*');
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Expose-Headers', 'Content-Length');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Access-Control-Allow-Credentials', 'true');

  // 处理 OPTIONS 预检请求
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
});

// 格式化 JSON 输出
app.use('*', prettyJSON());

/**
 * 健康检查接口
 */
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'CF-Nav API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API 信息接口
 */
app.get('/api', (c) => {
  return c.json({
    success: true,
    message: 'CF-Nav API v1',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me (需要认证)',
      },
      categories: {
        list: 'GET /api/categories',
        detail: 'GET /api/categories/:id',
        create: 'POST /api/categories (需要认证)',
        update: 'PUT /api/categories/:id (需要认证)',
        delete: 'DELETE /api/categories/:id (需要认证)',
        toggleVisibility: 'PATCH /api/categories/:id/visibility (需要认证)',
      },
      links: {
        list: 'GET /api/links',
        detail: 'GET /api/links/:id',
        create: 'POST /api/links (需要认证)',
        update: 'PUT /api/links/:id (需要认证)',
        delete: 'DELETE /api/links/:id (需要认证)',
        toggleVisibility: 'PATCH /api/links/:id/visibility (需要认证)',
        click: 'POST /api/links/:id/click',
        parse: 'POST /api/links/parse (需要认证)',
      },
    },
  });
});

/**
 * 挂载路由模块
 */
app.route('/api/auth', auth);
app.route('/api/categories', categoriesRouter);
app.route('/api/links', linksRouter);
app.route('/api/monitor', monitorRouter);

/**
 * 404 处理
 */
app.notFound(notFoundHandler);

/**
 * 全局错误处理
 */
app.onError(errorHandler);

/**
 * 导出应用（Cloudflare Workers 格式）
 */
export default app;
