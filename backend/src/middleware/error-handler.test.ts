/**
 * 错误处理中间件单元测试
 *
 * 测试范围:
 * - errorHandler: 全局错误处理中间件
 * - notFoundHandler: 404 处理器
 * - BusinessError: 自定义业务异常类
 *
 * 测试策略:
 * - 正常场景: 验证各类错误的正确处理
 * - 边界条件: 测试特殊错误格式和边缘情况
 * - 异常场景: 测试未知错误和复杂错误的降级处理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError, z } from 'zod';
import {
  errorHandler,
  notFoundHandler,
  BusinessError,
} from './error-handler';

describe('错误处理中间件', () => {
  /**
   * errorHandler 功能测试
   */
  describe('errorHandler', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();

      // 注册全局错误处理器
      app.onError(errorHandler);
    });

    it('应处理 HTTPException 错误', async () => {
      app.get('/http-error', () => {
        throw new HTTPException(403, { message: '禁止访问' });
      });

      const response = await app.request('/http-error');

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('禁止访问');
      expect(data.code).toBe('HTTP_EXCEPTION');
    });

    it('应处理数据库 UNIQUE 约束错误', async () => {
      app.get('/unique-error', () => {
        throw new Error('UNIQUE constraint failed: users.username');
      });

      const response = await app.request('/unique-error');

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('数据已存在，请检查是否重复');
      expect(data.code).toBe('DUPLICATE_ENTRY');
    });

    it('应处理数据库 FOREIGN KEY 约束错误', async () => {
      app.get('/fk-error', () => {
        throw new Error('FOREIGN KEY constraint failed');
      });

      const response = await app.request('/fk-error');

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('关联数据不存在');
      expect(data.code).toBe('FOREIGN_KEY_VIOLATION');
    });

    it('应处理 Zod 验证错误', async () => {
      app.get('/zod-error', () => {
        const schema = z.object({
          name: z.string(),
        });

        // 触发 Zod 验证错误
        try {
          schema.parse({ name: 123 });
        } catch (error) {
          throw error;
        }
      });

      const response = await app.request('/zod-error');

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('请求参数验证失败');
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toBeDefined();
    });

    it('应处理认证相关错误（包含 Token 关键字）', async () => {
      app.get('/token-error', () => {
        throw new Error('Token 已过期');
      });

      const response = await app.request('/token-error');

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('Token 已过期');
      expect(data.code).toBe('AUTH_ERROR');
    });

    it('应处理认证相关错误（包含"认证"关键字）', async () => {
      app.get('/auth-error', () => {
        throw new Error('认证失败：用户不存在');
      });

      const response = await app.request('/auth-error');

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('认证失败：用户不存在');
      expect(data.code).toBe('AUTH_ERROR');
    });

    it('应处理通用服务器错误（开发环境）', async () => {
      // 设置为开发环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/generic-error', () => {
        throw new Error('未知的服务器错误');
      });

      const response = await app.request('/generic-error');

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('服务器内部错误');
      expect(data.code).toBe('INTERNAL_SERVER_ERROR');
      expect(data.details).toBe('未知的服务器错误'); // 开发环境显示详情

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应处理通用服务器错误（生产环境）', async () => {
      // 设置为生产环境
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/generic-error', () => {
        throw new Error('敏感的内部错误');
      });

      const response = await app.request('/generic-error');

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('服务器内部错误');
      expect(data.code).toBe('INTERNAL_SERVER_ERROR');
      expect(data.details).toBeUndefined(); // 生产环境隐藏详情

      // 恢复环境变量
      process.env.NODE_ENV = originalEnv;
    });

    it('应记录错误日志（验证 console.error 被调用）', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      app.get('/log-error', () => {
        throw new Error('测试日志错误');
      });

      await app.request('/log-error');

      // 验证 console.error 被调用
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '错误详情:',
        expect.objectContaining({
          message: '测试日志错误',
          path: '/log-error',
          method: 'GET',
        })
      );

      consoleErrorSpy.mockRestore();
    });

    it('应处理没有 message 的错误对象', async () => {
      app.get('/no-message-error', () => {
        const error = new Error();
        error.message = ''; // 空 message
        throw error;
      });

      const response = await app.request('/no-message-error');

      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('应处理复杂的 HTTPException（带额外信息）', async () => {
      app.get('/complex-http-error', () => {
        throw new HTTPException(422, {
          message: '无法处理的实体',
          cause: { field: 'username', reason: 'invalid' },
        });
      });

      const response = await app.request('/complex-http-error');

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('无法处理的实体');
      expect(data.code).toBe('HTTP_EXCEPTION');
    });
  });

  /**
   * notFoundHandler 功能测试
   */
  describe('notFoundHandler', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();

      // 注册 404 处理器
      app.notFound(notFoundHandler);

      // 添加一个已知路由
      app.get('/exists', (c) => c.json({ message: 'This route exists' }));
    });

    it('应处理不存在的 GET 路由', async () => {
      const response = await app.request('/not-exists');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('接口不存在: GET /not-exists');
      expect(data.code).toBe('NOT_FOUND');
    });

    it('应处理不存在的 POST 路由', async () => {
      const response = await app.request('/not-exists', {
        method: 'POST',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.message).toBe('接口不存在: POST /not-exists');
    });

    it('应处理不存在的 PUT 路由', async () => {
      const response = await app.request('/not-exists', {
        method: 'PUT',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.message).toBe('接口不存在: PUT /not-exists');
    });

    it('应处理不存在的 DELETE 路由', async () => {
      const response = await app.request('/not-exists', {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.message).toBe('接口不存在: DELETE /not-exists');
    });

    it('应允许已知路由正常工作', async () => {
      const response = await app.request('/exists');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toBe('This route exists');
    });

    it('应处理带查询参数的不存在路由', async () => {
      const response = await app.request('/not-exists?key=value');

      expect(response.status).toBe(404);

      const data = await response.json();
      // 路径应该不包含查询参数
      expect(data.message).toBe('接口不存在: GET /not-exists');
    });

    it('应处理嵌套路径的不存在路由', async () => {
      const response = await app.request('/api/v1/not-exists');

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.message).toBe('接口不存在: GET /api/v1/not-exists');
    });
  });

  /**
   * BusinessError 自定义异常类测试
   */
  describe('BusinessError', () => {
    it('应创建默认的业务错误', () => {
      const error = new BusinessError('业务逻辑错误');

      expect(error.message).toBe('业务逻辑错误');
      expect(error.code).toBe('BUSINESS_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('BusinessError');
    });

    it('应创建自定义 code 的业务错误', () => {
      const error = new BusinessError('订单已取消', 'ORDER_CANCELLED');

      expect(error.message).toBe('订单已取消');
      expect(error.code).toBe('ORDER_CANCELLED');
      expect(error.statusCode).toBe(400);
    });

    it('应创建自定义 statusCode 的业务错误', () => {
      const error = new BusinessError('资源未找到', 'RESOURCE_NOT_FOUND', 404);

      expect(error.message).toBe('资源未找到');
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('应继承 Error 类的属性', () => {
      const error = new BusinessError('测试错误');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BusinessError);
      expect(error.stack).toBeDefined();
    });

    it('应在错误处理器中被捕获（作为通用 Error）', async () => {
      const app = new Hono();
      app.onError(errorHandler);

      app.get('/business-error', () => {
        throw new BusinessError('库存不足', 'INSUFFICIENT_STOCK', 422);
      });

      const response = await app.request('/business-error');

      // BusinessError 被当作通用 Error 处理
      expect(response.status).toBe(500); // errorHandler 默认返回 500
      // 注意：当前 errorHandler 未对 BusinessError 做特殊处理
    });
  });

  /**
   * 集成测试: 错误处理器与应用的集成
   */
  describe('错误处理器集成测试', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      app.onError(errorHandler);
      app.notFound(notFoundHandler);

      // 正常路由
      app.get('/success', (c) => c.json({ message: 'Success' }));

      // 各种错误路由
      app.get('/http-error', () => {
        throw new HTTPException(403, { message: 'Forbidden' });
      });

      app.get('/db-error', () => {
        throw new Error('UNIQUE constraint failed: test');
      });

      app.get('/auth-error', () => {
        throw new Error('Token 无效');
      });
    });

    it('应正确路由正常请求和错误请求', async () => {
      // 正常请求
      const successResponse = await app.request('/success');
      expect(successResponse.status).toBe(200);

      // HTTP 错误
      const httpErrorResponse = await app.request('/http-error');
      expect(httpErrorResponse.status).toBe(403);

      // 数据库错误
      const dbErrorResponse = await app.request('/db-error');
      expect(dbErrorResponse.status).toBe(409);

      // 认证错误
      const authErrorResponse = await app.request('/auth-error');
      expect(authErrorResponse.status).toBe(401);

      // 404 错误
      const notFoundResponse = await app.request('/not-exists');
      expect(notFoundResponse.status).toBe(404);
    });

    it('应保证所有错误响应格式统一', async () => {
      const endpoints = [
        '/http-error',
        '/db-error',
        '/auth-error',
        '/not-exists',
      ];

      for (const endpoint of endpoints) {
        const response = await app.request(endpoint);
        const data = await response.json();

        // 验证统一的错误格式
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('code');
        expect(typeof data.message).toBe('string');
        expect(typeof data.code).toBe('string');
      }
    });

    it('应在错误处理器中记录所有错误', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await app.request('/http-error');
      await app.request('/db-error');
      await app.request('/auth-error');

      // 验证每个错误都被记录
      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);

      consoleErrorSpy.mockRestore();
    });
  });
});
