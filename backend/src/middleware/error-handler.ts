import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * 统一错误响应格式
 */
interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  details?: unknown;
}

/**
 * 全局错误处理中间件
 * 捕获并格式化所有异常，返回统一的错误响应
 */
export function errorHandler(err: Error, c: Context) {
  console.error('错误详情:', {
    message: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  });

  // 处理 Hono HTTPException
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      code: 'HTTP_EXCEPTION',
    };
    return c.json(response, err.status);
  }

  // 处理数据库错误
  if (err.message.includes('UNIQUE constraint failed')) {
    const response: ErrorResponse = {
      success: false,
      message: '数据已存在，请检查是否重复',
      code: 'DUPLICATE_ENTRY',
    };
    return c.json(response, 409);
  }

  if (err.message.includes('FOREIGN KEY constraint failed')) {
    const response: ErrorResponse = {
      success: false,
      message: '关联数据不存在',
      code: 'FOREIGN_KEY_VIOLATION',
    };
    return c.json(response, 400);
  }

  // 处理验证错误（来自 zod）
  if (err.name === 'ZodError') {
    const response: ErrorResponse = {
      success: false,
      message: '请求参数验证失败',
      code: 'VALIDATION_ERROR',
      details: err,
    };
    return c.json(response, 400);
  }

  // 处理认证错误
  if (err.message.includes('Token') || err.message.includes('认证')) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      code: 'AUTH_ERROR',
    };
    return c.json(response, 401);
  }

  // 默认服务器错误
  const response: ErrorResponse = {
    success: false,
    message: '服务器内部错误',
    code: 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  };

  return c.json(response, 500);
}

/**
 * 404 Not Found 处理器
 */
export function notFoundHandler(c: Context) {
  const response: ErrorResponse = {
    success: false,
    message: `接口不存在: ${c.req.method} ${c.req.path}`,
    code: 'NOT_FOUND',
  };
  return c.json(response, 404);
}

/**
 * 自定义业务异常类
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string = 'BUSINESS_ERROR',
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}
