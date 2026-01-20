import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import auth from './routes/auth';
import categoriesRouter from './routes/categories';
import linksRouter from './routes/links';

/**
 * 环境变量类型定义
 */
type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
};

/**
 * 创建 Hono 应用实例
 */
const app = new Hono<{ Bindings: Bindings }>();

/**
 * 全局中间件配置
 */

// 日志中间件（开发环境）
app.use('*', logger());

// CORS 配置（允许前端跨域访问）
// 从环境变量读取允许的域名列表，多个域名用逗号分隔
app.use(
  '*',
  cors({
    origin: (origin) => {
      // 允许的域名列表（从环境变量读取，默认仅允许本地开发）
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://localhost:3000',
      ];

      // 如果请求来自允许的域名，或者是服务器端请求（无 origin），则允许
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || '*';
      }

      // 其他域名一律拒绝
      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
    credentials: true,
  })
);

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
