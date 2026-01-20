/**
 * Vitest 测试环境设置文件
 *
 * 功能说明:
 * - 导入 @testing-library/jest-dom 扩展断言（toBeInTheDocument 等）
 * - 配置全局测试环境（清理 DOM、重置模拟对象等）
 * - 设置测试前后的钩子函数
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * 每个测试后自动清理 DOM
 * 防止测试之间的状态污染
 */
afterEach(() => {
  cleanup();
});

/**
 * 模拟 window.matchMedia（某些组件可能需要）
 * 例如响应式组件或媒体查询相关的逻辑
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // 已废弃，但保留兼容性
    removeListener: () => {}, // 已废弃，但保留兼容性
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

/**
 * 模拟 IntersectionObserver（某些组件可能需要）
 * 例如懒加载或虚拟滚动组件
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

/**
 * 抑制控制台错误（仅在测试环境）
 * 避免预期的错误信息干扰测试输出
 */
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // 忽略 React 的某些预期错误
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
