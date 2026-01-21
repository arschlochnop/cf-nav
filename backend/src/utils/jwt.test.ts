/**
 * JWT 工具函数单元测试
 *
 * 测试范围:
 * - generateToken: JWT Token 生成功能
 * - verifyToken: JWT Token 验证功能
 * - extractToken: Authorization Header Token 提取功能
 *
 * 测试策略:
 * - 正常场景: 验证基本功能正确性
 * - 边界条件: 测试过期、无效格式等边界值
 * - 异常场景: 测试错误输入和错误处理
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateToken,
  verifyToken,
  extractToken,
  type JWTPayload,
} from './jwt';

describe('JWT 工具函数', () => {
  // 测试用的 JWT Secret（与实际环境变量匹配）
  const TEST_JWT_SECRET = 'test-secret-key-for-vitest';

  beforeEach(() => {
    // 确保环境变量存在（强制设置）
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  /**
   * generateToken 功能测试
   */
  describe('generateToken', () => {
    it('应成功生成有效的 JWT Token', () => {
      const userId = 1;
      const username = 'testuser';

      const token = generateToken(userId, username, TEST_JWT_SECRET);

      // 验证 Token 存在且为字符串
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('生成的 Token 应包含正确的 Payload', () => {
      const userId = 42;
      const username = 'johndoe';

      const token = generateToken(userId, username, TEST_JWT_SECRET);

      // 手动解码验证（不验证签名）
      const decoded = jwt.decode(token) as JWTPayload;

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
      expect(decoded.username).toBe(username);
    });

    it('生成的 Token 应包含过期时间 (exp)', () => {
      const token = generateToken(1, 'test', TEST_JWT_SECRET);

      const decoded = jwt.decode(token) as JWTPayload;

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000); // 未来时间
    });

    it('生成的 Token 应包含签发时间 (iat)', () => {
      const token = generateToken(1, 'test', TEST_JWT_SECRET);

      const decoded = jwt.decode(token) as JWTPayload;

      expect(decoded.iat).toBeDefined();
      expect(decoded.iat).toBeLessThanOrEqual(Date.now() / 1000); // 过去或当前时间
    });

    it('不同调用应生成不同的 Token (因为 iat 不同)', async () => {
      const userId = 1;
      const username = 'test';

      const token1 = generateToken(userId, username, TEST_JWT_SECRET);
      // JWT iat是秒级时间戳，需要等待至少1秒才能让iat不同
      await new Promise(resolve => setTimeout(resolve, 1100));
      const token2 = generateToken(userId, username, TEST_JWT_SECRET);

      // Token 应该不同（因为 iat 不同）
      expect(token1).not.toBe(token2);
    });

    it('应支持特殊字符的用户名', () => {
      const username = 'user@test.com';
      const token = generateToken(1, username, TEST_JWT_SECRET);

      const decoded = jwt.decode(token) as JWTPayload;
      expect(decoded.username).toBe(username);
    });

    it('应支持中文用户名', () => {
      const username = '测试用户';
      const token = generateToken(1, username, TEST_JWT_SECRET);

      const decoded = jwt.decode(token) as JWTPayload;
      expect(decoded.username).toBe(username);
    });

    it('应支持大用户 ID', () => {
      const userId = 999999999;
      const token = generateToken(userId, 'test', TEST_JWT_SECRET);

      const decoded = jwt.decode(token) as JWTPayload;
      expect(decoded.userId).toBe(userId);
    });
  });

  /**
   * verifyToken 功能测试
   */
  describe('verifyToken', () => {
    it('应成功验证有效的 Token', () => {
      const userId = 1;
      const username = 'testuser';
      const token = generateToken(userId, username, TEST_JWT_SECRET);

      const payload = verifyToken(token, TEST_JWT_SECRET);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(userId);
      expect(payload.username).toBe(username);
    });

    it('应拒绝篡改过的 Token', () => {
      const token = generateToken(1, 'test', TEST_JWT_SECRET);

      // 篡改 Token（修改最后一个字符）
      const tamperedToken = token.slice(0, -1) + 'X';

      expect(() => verifyToken(tamperedToken, TEST_JWT_SECRET)).toThrow('Token 无效');
    });

    it('应拒绝格式错误的 Token', () => {
      const invalidToken = 'not.a.valid.jwt.token';

      expect(() => verifyToken(invalidToken, TEST_JWT_SECRET)).toThrow('Token 无效');
    });

    it('应拒绝空 Token', () => {
      expect(() => verifyToken('', TEST_JWT_SECRET)).toThrow();
    });

    it('应拒绝使用错误密钥签名的 Token', () => {
      // 使用不同的密钥生成 Token
      const wrongSecretToken = jwt.sign(
        { userId: 1, username: 'test' },
        'wrong-secret-key',
        { expiresIn: '7d' }
      );

      expect(() => verifyToken(wrongSecretToken, TEST_JWT_SECRET)).toThrow('Token 无效');
    });

    it('应拒绝已过期的 Token', () => {
      // 生成一个已过期的 Token (expiresIn: -1s)
      const expiredToken = jwt.sign(
        { userId: 1, username: 'test' },
        TEST_JWT_SECRET,
        { expiresIn: '-1s' }
      );

      expect(() => verifyToken(expiredToken, TEST_JWT_SECRET)).toThrow('Token 已过期');
    });

    it('应正确返回 Payload 中的所有字段', () => {
      const userId = 42;
      const username = 'johndoe';
      const token = generateToken(userId, username, TEST_JWT_SECRET);

      const payload = verifyToken(token, TEST_JWT_SECRET);

      expect(payload.userId).toBe(userId);
      expect(payload.username).toBe(username);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it('应支持验证特殊字符用户名的 Token', () => {
      const username = 'user@example.com';
      const token = generateToken(1, username, TEST_JWT_SECRET);

      const payload = verifyToken(token, TEST_JWT_SECRET);
      expect(payload.username).toBe(username);
    });

    it('应支持验证中文用户名的 Token', () => {
      const username = '测试用户';
      const token = generateToken(1, username, TEST_JWT_SECRET);

      const payload = verifyToken(token, TEST_JWT_SECRET);
      expect(payload.username).toBe(username);
    });
  });

  /**
   * extractToken 功能测试
   */
  describe('extractToken', () => {
    it('应从 Bearer 格式的 Header 中提取 Token', () => {
      const token = 'sample.jwt.token';
      const authHeader = `Bearer ${token}`;

      const extracted = extractToken(authHeader);

      expect(extracted).toBe(token);
    });

    it('应支持直接传入 Token（无 Bearer 前缀）', () => {
      const token = 'sample.jwt.token';

      const extracted = extractToken(token);

      expect(extracted).toBe(token);
    });

    it('应处理未定义的 Header', () => {
      const extracted = extractToken(undefined);

      expect(extracted).toBeNull();
    });

    it('应处理空字符串 Header', () => {
      const extracted = extractToken('');

      // 空字符串等同于 undefined，返回 null
      expect(extracted).toBeNull();
    });

    it('应处理格式错误的 Bearer Header (只有 Bearer)', () => {
      const authHeader = 'Bearer';

      // 只有 "Bearer" 没有 Token，split 后 parts.length = 1
      // 会走兼容分支，返回整个字符串
      const extracted = extractToken(authHeader);

      expect(extracted).toBe(authHeader);
    });

    it('应处理 Bearer 后有多个空格的情况', () => {
      const token = 'sample.jwt.token';
      const authHeader = `Bearer  ${token}`; // 两个空格

      // split(' ') 会产生 ['Bearer', '', 'sample.jwt.token']
      // parts.length !== 2，走兼容分支
      const extracted = extractToken(authHeader);

      expect(extracted).toBe(authHeader);
    });

    it('应处理小写 bearer 的情况 (不符合标准)', () => {
      const token = 'sample.jwt.token';
      const authHeader = `bearer ${token}`;

      // 不符合标准 (Bearer 大写)，应返回整个字符串
      const extracted = extractToken(authHeader);

      expect(extracted).toBe(authHeader);
    });

    it('应处理其他认证方案 (如 Basic)', () => {
      const authHeader = 'Basic dXNlcjpwYXNz';

      // 不是 Bearer，返回整个字符串（兼容性处理）
      const extracted = extractToken(authHeader);

      expect(extracted).toBe(authHeader);
    });

    it('应处理包含特殊字符的 Token', () => {
      const token = 'sample.jwt.token-with_special+chars=';
      const authHeader = `Bearer ${token}`;

      const extracted = extractToken(authHeader);

      expect(extracted).toBe(token);
    });
  });

  /**
   * 集成测试: 完整的 Token 生命周期
   */
  describe('Token 生命周期集成测试', () => {
    it('应完成完整的 Token 生成、提取和验证流程', () => {
      const userId = 123;
      const username = 'integration-test-user';

      // 1. 生成 Token
      const token = generateToken(userId, username, TEST_JWT_SECRET);
      expect(token).toBeDefined();

      // 2. 模拟 HTTP Authorization Header
      const authHeader = `Bearer ${token}`;

      // 3. 提取 Token
      const extracted = extractToken(authHeader);
      expect(extracted).toBe(token);

      // 4. 验证 Token
      const payload = verifyToken(extracted!, TEST_JWT_SECRET);
      expect(payload.userId).toBe(userId);
      expect(payload.username).toBe(username);
    });

    it('应拒绝完整流程中篡改的 Token', () => {
      const token = generateToken(1, 'test', TEST_JWT_SECRET);
      const authHeader = `Bearer ${token}`;

      // 提取并篡改
      const extracted = extractToken(authHeader);
      const tampered = extracted!.slice(0, -1) + 'X';

      // 验证应失败
      expect(() => verifyToken(tampered, TEST_JWT_SECRET)).toThrow('Token 无效');
    });

    it('应处理没有 Bearer 前缀的直接 Token', () => {
      const userId = 456;
      const username = 'direct-token-user';

      // 生成 Token
      const token = generateToken(userId, username, TEST_JWT_SECRET);

      // 直接提取（无 Bearer）
      const extracted = extractToken(token);
      expect(extracted).toBe(token);

      // 验证
      const payload = verifyToken(extracted!, TEST_JWT_SECRET);
      expect(payload.userId).toBe(userId);
      expect(payload.username).toBe(username);
    });
  });
});
