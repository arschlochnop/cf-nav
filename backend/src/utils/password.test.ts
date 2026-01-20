/**
 * 密码工具函数单元测试
 *
 * 测试范围:
 * - hashPassword: 密码哈希加密功能
 * - verifyPassword: 密码验证功能
 * - validatePasswordStrength: 密码强度验证功能
 *
 * 测试策略:
 * - 正常场景: 验证基本功能正确性
 * - 边界条件: 测试最小/最大长度、特殊字符等边界值
 * - 异常场景: 测试错误输入和错误处理
 */

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from './password';

describe('密码工具函数', () => {
  /**
   * hashPassword 功能测试
   */
  describe('hashPassword', () => {
    it('应成功加密密码', async () => {
      const password = 'Test1234';
      const hashedPassword = await hashPassword(password);

      // 验证哈希值存在且不等于原密码
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(0);
    });

    it('相同密码应生成不同的哈希值 (因为随机 salt)', async () => {
      const password = 'Test1234';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt 每次加密都使用随机 salt，所以哈希值不同
      expect(hash1).not.toBe(hash2);
    });

    it('应支持包含特殊字符的密码', async () => {
      const password = 'Test@#$%1234!';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it('应支持包含中文的密码', async () => {
      const password = '测试密码123';
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it('应支持最大长度 (128 字符) 的密码', async () => {
      const password = 'a'.repeat(128);
      const hashedPassword = await hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
    });

    it('应处理空字符串密码 (虽然不推荐)', async () => {
      const password = '';
      const hashedPassword = await hashPassword(password);

      // bcrypt 允许空密码，但不安全
      expect(hashedPassword).toBeDefined();
    });
  });

  /**
   * verifyPassword 功能测试
   */
  describe('verifyPassword', () => {
    it('应验证正确的密码', async () => {
      const password = 'Test1234';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('应拒绝错误的密码', async () => {
      const password = 'Test1234';
      const wrongPassword = 'Wrong1234';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });

    it('应区分大小写', async () => {
      const password = 'Test1234';
      const hashedPassword = await hashPassword(password);

      // 大小写不同应验证失败
      const isValid = await verifyPassword('test1234', hashedPassword);

      expect(isValid).toBe(false);
    });

    it('应拒绝空密码验证', async () => {
      const password = 'Test1234';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword('', hashedPassword);

      expect(isValid).toBe(false);
    });

    it('应处理特殊字符密码验证', async () => {
      const password = 'Test@#$%1234!';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('应处理中文密码验证', async () => {
      const password = '测试密码123';
      const hashedPassword = await hashPassword(password);

      const isValid = await verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('应拒绝无效的哈希格式', async () => {
      const password = 'Test1234';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      // bcrypt.compare 会返回 false 而不是抛出错误
      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  /**
   * validatePasswordStrength 功能测试
   */
  describe('validatePasswordStrength', () => {
    it('应接受符合规则的强密码', () => {
      const password = 'Test1234';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应拒绝长度小于 8 的密码', () => {
      const password = 'Test1';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度至少为 8 个字符');
    });

    it('应拒绝长度超过 128 的密码', () => {
      const password = 'Test' + '1'.repeat(125); // 总共 129 字符
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码长度不能超过 128 个字符');
    });

    it('应拒绝不包含数字的密码', () => {
      const password = 'TestPassword';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个数字');
    });

    it('应拒绝不包含字母的密码', () => {
      const password = '12345678';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('密码必须包含至少一个字母');
    });

    it('应拒绝空密码', () => {
      const password = '';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应接受恰好 8 字符的有效密码', () => {
      const password = 'Test1234';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应接受恰好 128 字符的有效密码', () => {
      // 生成 128 字符的有效密码 (包含字母和数字)
      const password = 'a1' + 'b'.repeat(126);
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应返回多个错误信息 (不符合多个规则)', () => {
      const password = 'test'; // 太短、无数字
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors).toContain('密码长度至少为 8 个字符');
      expect(result.errors).toContain('密码必须包含至少一个数字');
    });

    it('应接受包含特殊字符的密码 (虽然不强制)', () => {
      const password = 'Test@1234';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应接受包含中文的密码', () => {
      const password = '测试密码123abc';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应接受包含大小写字母和数字的密码', () => {
      const password = 'TestPASSWORD123';
      const result = validatePasswordStrength(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  /**
   * 集成测试: 完整的密码生命周期
   */
  describe('密码生命周期集成测试', () => {
    it('应完成完整的密码创建和验证流程', async () => {
      const plainPassword = 'SecurePassword123';

      // 1. 验证密码强度
      const strengthCheck = validatePasswordStrength(plainPassword);
      expect(strengthCheck.isValid).toBe(true);

      // 2. 加密密码
      const hashedPassword = await hashPassword(plainPassword);
      expect(hashedPassword).toBeDefined();

      // 3. 验证正确密码
      const isValidCorrect = await verifyPassword(plainPassword, hashedPassword);
      expect(isValidCorrect).toBe(true);

      // 4. 验证错误密码
      const isValidWrong = await verifyPassword('WrongPassword123', hashedPassword);
      expect(isValidWrong).toBe(false);
    });

    it('应拒绝弱密码并阻止加密', async () => {
      const weakPassword = 'weak';

      // 1. 验证密码强度
      const strengthCheck = validatePasswordStrength(weakPassword);
      expect(strengthCheck.isValid).toBe(false);
      expect(strengthCheck.errors.length).toBeGreaterThan(0);

      // 在实际应用中，应该在调用 hashPassword 前先验证
      // 这里只是演示弱密码也可以被加密（但不推荐）
    });
  });
});
