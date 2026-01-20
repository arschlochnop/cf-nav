/**
 * 认证中间件单元测试
 *
 * 测试范围:
 * - authMiddleware: 强制认证中间件
 * - optionalAuthMiddleware: 可选认证中间件
 *
 * 测试策略:
 * - 正常场景: 验证有效 Token 的处理
 * - 边界条件: 测试 Token 缺失、格式错误等边界值
 * - 异常场景: 测试过期、篡改 Token 等异常情况
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, optionalAuthMiddleware } from './auth';
import { generateToken } from '../utils/jwt';

describe('认证中间件', () => {
  beforeEach(() => {
    // 确保环境变量存在
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest';
  });

  /**
   * authMiddleware 功能测试（强制认证）
   */
  describe('authMiddleware', () => {
    let app: Hono;

    beforeEach(() => {
      // 每个测试前创建新的 Hono 实例
      app = new Hono();

      // 添加认证中间件保护的测试路由
      app.get('/protected', authMiddleware, (c) => {
        const user = c.get('user');
        return c.json({
          success: true,
          message: 'Protected resource',
          user,
        });
      });
    });

    it('应允许携带有效 Token 的请求通过', async () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateToken(userId, username);

      const response = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        userId,
        username,
      });
    });

    it('应拒绝没有 Authorization Header 的请求', async () => {
      const response = await app.request('/protected');

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('未提供认证令牌');
      expect(data.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('应拒绝空 Authorization Header 的请求', async () => {
      const response = await app.request('/protected', {
        headers: {
          Authorization: '',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('应拒绝格式错误的 Token', async () => {
      const response = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer invalid.token.format',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('应拒绝篡改过的 Token', async () => {
      const token = generateToken(1, 'test');
      const tamperedToken = token.slice(0, -1) + 'X';

      const response = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('应支持不带 Bearer 前缀的 Token', async () => {
      const userId = 2;
      const username = 'directuser';
      const token = generateToken(userId, username);

      const response = await app.request('/protected', {
        headers: {
          Authorization: token, // 直接传 Token
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        userId,
        username,
      });
    });

    it('应正确提取和注入用户信息到 Context', async () => {
      const userId = 42;
      const username = 'johndoe';
      const token = generateToken(userId, username);

      const response = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      // 验证用户信息被正确注入
      expect(data.user.userId).toBe(userId);
      expect(data.user.username).toBe(username);
    });

    it('应拒绝不包含 Token 的 Bearer Header', async () => {
      const response = await app.request('/protected', {
        headers: {
          Authorization: 'Bearer',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('应处理大小写敏感的 Bearer 前缀', async () => {
      const token = generateToken(1, 'test');

      const response = await app.request('/protected', {
        headers: {
          Authorization: `bearer ${token}`, // 小写 bearer
        },
      });

      // extractToken 会将整个字符串作为 Token，导致验证失败
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('应支持特殊字符用户名的 Token', async () => {
      const username = 'user@example.com';
      const token = generateToken(1, username);

      const response = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user.username).toBe(username);
    });

    it('应支持中文用户名的 Token', async () => {
      const username = '测试用户';
      const token = generateToken(1, username);

      const response = await app.request('/protected', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user.username).toBe(username);
    });
  });

  /**
   * optionalAuthMiddleware 功能测试（可选认证）
   */
  describe('optionalAuthMiddleware', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();

      // 添加可选认证的测试路由
      app.get('/optional', optionalAuthMiddleware, (c) => {
        const user = c.get('user');
        return c.json({
          success: true,
          message: 'Optional auth resource',
          user: user || null,
          isAuthenticated: !!user,
        });
      });
    });

    it('应允许携带有效 Token 的请求通过并注入用户信息', async () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateToken(userId, username);

      const response = await app.request('/optional', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.isAuthenticated).toBe(true);
      expect(data.user).toEqual({
        userId,
        username,
      });
    });

    it('应允许没有 Token 的请求通过（未认证状态）', async () => {
      const response = await app.request('/optional');

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.isAuthenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('应忽略无效的 Token 并继续执行（未认证状态）', async () => {
      const response = await app.request('/optional', {
        headers: {
          Authorization: 'Bearer invalid.token.format',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.isAuthenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('应忽略篡改过的 Token 并继续执行', async () => {
      const token = generateToken(1, 'test');
      const tamperedToken = token.slice(0, -1) + 'X';

      const response = await app.request('/optional', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isAuthenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('应支持不带 Bearer 前缀的 Token', async () => {
      const userId = 3;
      const username = 'optionaluser';
      const token = generateToken(userId, username);

      const response = await app.request('/optional', {
        headers: {
          Authorization: token,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isAuthenticated).toBe(true);
      expect(data.user).toEqual({
        userId,
        username,
      });
    });

    it('应忽略空 Authorization Header', async () => {
      const response = await app.request('/optional', {
        headers: {
          Authorization: '',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.isAuthenticated).toBe(false);
      expect(data.user).toBeNull();
    });

    it('应处理内部异常并继续执行', async () => {
      // 创建一个会触发异常的场景
      const response = await app.request('/optional', {
        headers: {
          Authorization: 'Bearer ' + 'x'.repeat(10000), // 超长 Token
        },
      });

      // 应该能够继续执行，不会抛出异常
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      // 异常处理后应该是未认证状态
      expect(data.isAuthenticated).toBe(false);
    });

    it('应区分认证和未认证状态', async () => {
      const token = generateToken(5, 'authenticateduser');

      // 认证请求
      const authResponse = await app.request('/optional', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const authData = await authResponse.json();
      expect(authData.isAuthenticated).toBe(true);

      // 未认证请求
      const unauthResponse = await app.request('/optional');

      const unauthData = await unauthResponse.json();
      expect(unauthData.isAuthenticated).toBe(false);

      // 两者应该不同
      expect(authData.user).not.toEqual(unauthData.user);
    });
  });

  /**
   * 集成测试: 认证中间件在多路由场景中的行为
   */
  describe('认证中间件集成测试', () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();

      // 公开路由（无认证）
      app.get('/public', (c) => {
        return c.json({ message: 'Public resource' });
      });

      // 可选认证路由
      app.get('/optional', optionalAuthMiddleware, (c) => {
        const user = c.get('user');
        return c.json({
          message: 'Optional auth resource',
          isAuthenticated: !!user,
        });
      });

      // 强制认证路由
      app.get('/protected', authMiddleware, (c) => {
        return c.json({ message: 'Protected resource' });
      });
    });

    it('应正确处理不同认证级别的路由', async () => {
      const token = generateToken(1, 'test');

      // 公开路由应该总是成功
      const publicResponse = await app.request('/public');
      expect(publicResponse.status).toBe(200);

      // 可选认证路由应该在有/无 Token 时都成功
      const optionalWithToken = await app.request('/optional', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(optionalWithToken.status).toBe(200);

      const optionalWithoutToken = await app.request('/optional');
      expect(optionalWithoutToken.status).toBe(200);

      // 强制认证路由只有在有 Token 时成功
      const protectedWithToken = await app.request('/protected', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(protectedWithToken.status).toBe(200);

      const protectedWithoutToken = await app.request('/protected');
      expect(protectedWithoutToken.status).toBe(401);
    });

    it('应在认证链中正确传递用户信息', async () => {
      // 添加多个中间件的路由
      app.get(
        '/multi-middleware',
        authMiddleware,
        async (c, next) => {
          // 第二个中间件应该能访问用户信息
          const user = c.get('user');
          expect(user).toBeDefined();
          await next();
        },
        (c) => {
          const user = c.get('user');
          return c.json({ user });
        }
      );

      const token = generateToken(10, 'multiuser');
      const response = await app.request('/multi-middleware', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.user.userId).toBe(10);
      expect(data.user.username).toBe('multiuser');
    });
  });
});
