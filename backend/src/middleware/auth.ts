import { Context, Next } from 'hono';
import { verifyToken, extractToken } from '../utils/jwt';

/**
 * 扩展 Hono Context 类型，添加用户信息
 */
export interface AuthContext extends Context {
  user?: {
    userId: number;
    username: string;
  };
}

/**
 * JWT 认证中间件
 * 验证请求的 Authorization Header 中的 Token
 * 验证成功后将用户信息注入到 context 中
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    // 提取 Authorization Header
    const authHeader = c.req.header('Authorization');
    const token = extractToken(authHeader);

    if (!token) {
      return c.json(
        {
          success: false,
          message: '未提供认证令牌',
          code: 'AUTH_TOKEN_MISSING',
        },
        401
      );
    }

    // 验证 Token
    const payload = verifyToken(token);

    // 将用户信息注入到 context
    c.set('user', {
      userId: payload.userId,
      username: payload.username,
    });

    // 继续执行后续中间件
    await next();
  } catch (error) {
    // Token 验证失败
    return c.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '认证失败',
        code: 'AUTH_FAILED',
      },
      401
    );
  }
}

/**
 * 可选认证中间件
 * 如果提供了 Token 则验证，但不强制要求
 * 用于某些需要区分登录/未登录状态的接口
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractToken(authHeader);

    if (token) {
      try {
        const payload = verifyToken(token);
        c.set('user', {
          userId: payload.userId,
          username: payload.username,
        });
      } catch (error) {
        // Token 无效时忽略，不抛出错误
        console.warn('可选认证失败:', error);
      }
    }

    await next();
  } catch (error) {
    // 异常情况下继续执行
    await next();
  }
}
