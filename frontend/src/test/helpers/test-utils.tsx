/**
 * 前端测试工具函数
 *
 * 功能说明:
 * - 提供 React 组件的渲染工具（包含路由、状态管理等上下文）
 * - 提供 API 请求模拟工具
 * - 提供测试数据生成器
 * - 提供常用的测试断言辅助函数
 */

import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement, ReactNode } from 'react';

/**
 * 自定义渲染函数（包含所有必要的 Provider）
 *
 * 为什么需要:
 * - 大多数组件依赖 Router 上下文
 * - 某些组件需要状态管理上下文
 * - 统一的渲染配置避免重复代码
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

export function renderWithRouter(
  ui: ReactElement,
  { initialRoute = '/', ...renderOptions }: CustomRenderOptions = {}
) {
  // 设置初始路由
  if (initialRoute !== '/') {
    window.history.pushState({}, '', initialRoute);
  }

  function Wrapper({ children }: { children: ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * 创建模拟的 API 响应
 */
export function createMockResponse<T>(data: T, options?: {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
}) {
  return {
    ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
    status: options?.status || 200,
    statusText: options?.statusText || 'OK',
    headers: new Headers(options?.headers),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

/**
 * 创建模拟的错误响应
 */
export function createMockErrorResponse(
  message: string,
  status: number = 400
) {
  return createMockResponse(
    { error: message },
    { status, statusText: 'Error' }
  );
}

/**
 * 测试用户数据生成器
 */
export function generateTestUser(override?: Partial<{
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
}>) {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    created_at: new Date().toISOString(),
    ...override,
  };
}

/**
 * 测试分类数据生成器
 */
export function generateTestCategory(override?: Partial<{
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}>) {
  return {
    id: 1,
    name: '测试分类',
    description: '这是一个测试分类',
    icon: '📁',
    sort_order: 0,
    ...override,
  };
}

/**
 * 测试链接数据生成器
 */
export function generateTestLink(override?: Partial<{
  id: number;
  category_id: number;
  title: string;
  url: string;
  description: string;
  icon: string;
  sort_order: number;
  is_visible: number;
  click_count: number;
}>) {
  return {
    id: 1,
    category_id: 1,
    title: '测试链接',
    url: 'https://example.com',
    description: '这是一个测试链接',
    icon: 'https://example.com/favicon.ico',
    sort_order: 0,
    is_visible: 1,
    click_count: 0,
    ...override,
  };
}

/**
 * 模拟 localStorage
 */
export class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

/**
 * 设置模拟的 localStorage
 */
export function setupMockLocalStorage() {
  const mockLocalStorage = new MockLocalStorage();

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });

  return mockLocalStorage;
}

/**
 * 等待异步操作完成
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
