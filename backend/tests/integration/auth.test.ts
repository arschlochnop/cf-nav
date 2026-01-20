/**
 * 认证路由集成测试
 *
 * 测试范围:
 * - POST /auth/login: 用户登录
 * - POST /auth/register: 用户注册
 * - GET /auth/me: 获取当前用户信息
 *
 * 测试策略:
 * - 正常场景: 验证完整的认证流程
 * - 边界条件: 测试参数验证、重复注册等边界值
 * - 异常场景: 测试错误凭证、Token 过期等异常情况
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { users } from '../../src/db/schema';
import { hashPassword } from '../../src/utils/password';
import { generateToken } from '../../src/utils/jwt';
import { eq } from 'drizzle-orm';

describe('认证路由集成测试', () => {
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    // 初始化数据库连接
    db = drizzle(env.DB);
  });

  beforeEach(async () => {
    // 每个测试前清空用户表
    await db.delete(users);
  });

  afterAll(async () => {
    // 测试完成后清理
    await db.delete(users);
  });

  /**
   * POST /auth/register 测试
   */
  describe('POST /auth/register', () => {
    it('应成功注册新用户', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'Test1234',
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('注册成功');
      expect(data.data.token).toBeDefined();
      expect(data.data.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(data.data.user.id).toBeDefined();

      // 验证数据库中用户已创建
      const dbUsers = await db.select().from(users).where(eq(users.username, 'testuser'));
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].email).toBe('test@example.com');
    });

    it('应拒绝弱密码注册', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'weak',
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('WEAK_PASSWORD');
      expect(data.errors).toBeDefined();
      expect(data.errors.length).toBeGreaterThan(0);
    });

    it('应拒绝重复的用户名', async () => {
      // 创建第一个用户
      await db.insert(users).values({
        username: 'existinguser',
        password: await hashPassword('Test1234'),
        email: 'existing@example.com',
      });

      // 尝试注册相同用户名
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'existinguser',
          password: 'Test1234',
          email: 'another@example.com',
        }),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('用户名已存在');
      expect(data.code).toBe('USERNAME_EXISTS');
    });

    it('应拒绝重复的邮箱', async () => {
      // 创建第一个用户
      await db.insert(users).values({
        username: 'user1',
        password: await hashPassword('Test1234'),
        email: 'duplicate@example.com',
      });

      // 尝试注册相同邮箱
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'user2',
          password: 'Test1234',
          email: 'duplicate@example.com',
        }),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('邮箱已被使用');
      expect(data.code).toBe('EMAIL_EXISTS');
    });

    it('应拒绝无效的邮箱格式', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'Test1234',
          email: 'invalid-email',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝过短的用户名', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'ab',
          password: 'Test1234',
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝过长的用户名', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'a'.repeat(51),
          password: 'Test1234',
          email: 'test@example.com',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝缺少必填字段的请求', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          // 缺少 password 和 email
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应对密码进行哈希存储', async () => {
      const plainPassword = 'Test1234';

      await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: plainPassword,
          email: 'test@example.com',
        }),
      });

      // 验证数据库中的密码已哈希
      const dbUsers = await db.select().from(users).where(eq(users.username, 'testuser'));
      expect(dbUsers[0].password).not.toBe(plainPassword);
      expect(dbUsers[0].password.startsWith('$2')).toBe(true); // bcrypt 哈希特征
    });
  });

  /**
   * POST /auth/login 测试
   */
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // 每个测试前创建测试用户
      await db.insert(users).values({
        username: 'loginuser',
        password: await hashPassword('Test1234'),
        email: 'login@example.com',
      });
    });

    it('应成功登录并返回 Token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'Test1234',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('登录成功');
      expect(data.data.token).toBeDefined();
      expect(data.data.user).toMatchObject({
        username: 'loginuser',
        email: 'login@example.com',
      });
      expect(data.data.user.id).toBeDefined();
    });

    it('应拒绝错误的密码', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'WrongPassword123',
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('用户名或密码错误');
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('应拒绝不存在的用户名', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'Test1234',
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('用户名或密码错误');
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('应拒绝空密码', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'loginuser',
          password: '',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应拒绝过短的用户名', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'ab',
          password: 'Test1234',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('应区分大小写密码', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'test1234', // 小写
        }),
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_CREDENTIALS');
    });

    it('应返回有效的 JWT Token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'loginuser',
          password: 'Test1234',
        }),
      });

      const data = await response.json();
      const token = data.data.token;

      // 验证 Token 格式（JWT 由三部分组成，用 . 分隔）
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });
  });

  /**
   * GET /auth/me 测试
   */
  describe('GET /auth/me', () => {
    let validToken: string;
    let userId: number;

    beforeEach(async () => {
      // 创建测试用户
      const result = await db.insert(users).values({
        username: 'meuser',
        password: await hashPassword('Test1234'),
        email: 'me@example.com',
      });

      userId = result.lastInsertRowid as number;
      validToken = await generateToken(userId, 'meuser', 'test-jwt-secret-key-for-vitest');
    });

    it('应返回当前登录用户的信息', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: userId,
        username: 'meuser',
        email: 'me@example.com',
      });
      expect(data.data.createdAt).toBeDefined();
    });

    it('应拒绝没有 Token 的请求', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_TOKEN_MISSING');
    });

    it('应拒绝无效的 Token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid.token.here',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('应拒绝篡改的 Token', async () => {
      const tamperedToken = validToken.slice(0, -1) + 'X';

      const response = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('AUTH_FAILED');
    });

    it('应处理用户不存在的情况', async () => {
      // 创建一个不存在用户的 Token
      const nonExistentToken = await generateToken(999999, 'nonexistent', 'test-jwt-secret-key-for-vitest');

      const response = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${nonExistentToken}`,
        },
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBe('用户不存在');
      expect(data.code).toBe('USER_NOT_FOUND');
    });

    it('应支持不带 Bearer 前缀的 Token', async () => {
      const response = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: validToken, // 直接传 Token
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.username).toBe('meuser');
    });
  });

  /**
   * 集成测试: 完整的认证流程
   */
  describe('完整的认证流程', () => {
    it('应完成注册 -> 登录 -> 获取用户信息的完整流程', async () => {
      // 1. 注册
      const registerResponse = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'fullflowuser',
          password: 'FullFlow1234',
          email: 'fullflow@example.com',
        }),
      });

      expect(registerResponse.status).toBe(201);
      const registerData = await registerResponse.json();
      const registerToken = registerData.data.token;

      // 2. 使用注册返回的 Token 获取用户信息
      const meResponse1 = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${registerToken}`,
        },
      });

      expect(meResponse1.status).toBe(200);
      const meData1 = await meResponse1.json();
      expect(meData1.data.username).toBe('fullflowuser');

      // 3. 登录
      const loginResponse = await SELF.fetch('http://localhost/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'fullflowuser',
          password: 'FullFlow1234',
        }),
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      const loginToken = loginData.data.token;

      // 4. 使用登录返回的 Token 获取用户信息
      const meResponse2 = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loginToken}`,
        },
      });

      expect(meResponse2.status).toBe(200);
      const meData2 = await meResponse2.json();
      expect(meData2.data.username).toBe('fullflowuser');
      expect(meData2.data.email).toBe('fullflow@example.com');

      // 验证两次获取的用户信息一致
      expect(meData1.data.id).toBe(meData2.data.id);
    });

    it('应阻止使用旧 Token 访问已删除的用户', async () => {
      // 1. 注册用户
      const registerResponse = await SELF.fetch('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'deleteduser',
          password: 'Test1234',
          email: 'deleted@example.com',
        }),
      });

      const registerData = await registerResponse.json();
      const token = registerData.data.token;

      // 2. 删除用户
      await db.delete(users).where(eq(users.username, 'deleteduser'));

      // 3. 尝试使用旧 Token 访问
      const meResponse = await SELF.fetch('http://localhost/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(meResponse.status).toBe(404);

      const data = await meResponse.json();
      expect(data.code).toBe('USER_NOT_FOUND');
    });
  });
});
