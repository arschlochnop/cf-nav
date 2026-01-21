/**
 * 前端类型定义
 */

/**
 * 用户信息
 */
export interface User {
  id: number;
  username: string;
  email: string;
  createdAt: string;
}

/**
 * 分类
 */
export interface Category {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 链接
 */
export interface Link {
  id: number;
  categoryId: number;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isVisible: boolean;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * API 响应基础结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  errors?: string[];
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

/**
 * 登录/注册响应
 */
export interface AuthResponse {
  token: string;
  user: User;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

/**
 * 创建分类请求
 */
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isVisible?: boolean;
}

/**
 * 创建链接请求
 */
export interface CreateLinkRequest {
  categoryId: number;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isVisible?: boolean;
}

/**
 * 网站元信息
 */
export interface WebsiteMetadata {
  title: string;
  description?: string;
  icon?: string;
  url: string;
}
