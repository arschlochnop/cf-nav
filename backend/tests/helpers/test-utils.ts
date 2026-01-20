/**
 * 后端测试工具函数
 *
 * 功能说明:
 * - 提供创建测试用户、分类、链接的辅助函数
 * - 提供 JWT 令牌生成和验证工具
 * - 提供数据库清理和初始化工具
 * - 提供 HTTP 请求模拟工具
 */

import { sign } from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

/**
 * 测试用户数据生成器
 */
export function generateTestUser(override?: Partial<{
  username: string;
  password: string;
  email: string;
  role: string;
}>) {
  return {
    username: 'testuser',
    password: 'Test123456',
    email: 'test@example.com',
    role: 'user',
    ...override,
  };
}

/**
 * 测试管理员数据生成器
 */
export function generateTestAdmin(override?: Partial<{
  username: string;
  password: string;
  email: string;
}>) {
  return generateTestUser({
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    ...override,
  });
}

/**
 * 测试分类数据生成器
 */
export function generateTestCategory(override?: Partial<{
  name: string;
  description: string;
  sort_order: number;
  icon: string;
}>) {
  return {
    name: '测试分类',
    description: '这是一个测试分类',
    sort_order: 0,
    icon: '📁',
    ...override,
  };
}

/**
 * 测试链接数据生成器
 */
export function generateTestLink(categoryId: number, override?: Partial<{
  title: string;
  url: string;
  description: string;
  icon: string;
  sort_order: number;
  is_visible: number;
}>) {
  return {
    category_id: categoryId,
    title: '测试链接',
    url: 'https://example.com',
    description: '这是一个测试链接',
    icon: 'https://example.com/favicon.ico',
    sort_order: 0,
    is_visible: 1,
    ...override,
  };
}

/**
 * 生成 JWT 令牌
 */
export function generateToken(payload: { userId: number; role: string }, secret: string = 'test-secret') {
  return sign(payload, secret, { expiresIn: '24h' });
}

/**
 * 哈希密码（用于测试数据准备）
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码（用于测试断言）
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 创建模拟的 Cloudflare Workers 环境
 */
export function createMockEnv(override?: Partial<{
  DB: any;
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
}>): any {
  return {
    JWT_SECRET: 'test-secret',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'Admin123456',
    ...override,
  };
}

/**
 * 创建模拟的 HTTP 请求对象
 */
export function createMockRequest(
  method: string,
  path: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }
): Request {
  const url = new URL(path, 'http://localhost');

  // 添加查询参数
  if (options?.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const headers = new Headers(options?.headers || {});

  // 如果有 body，自动设置 Content-Type
  if (options?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Request(url.toString(), {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * 解析响应 JSON（测试断言辅助）
 */
export async function parseResponse<T = any>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/**
 * 等待异步操作（测试延迟辅助）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串（用于唯一性测试）
 */
export function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机邮箱（用于唯一性测试）
 */
export function randomEmail(): string {
  return `test-${randomString()}@example.com`;
}
