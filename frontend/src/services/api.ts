import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ChangePasswordRequest,
  User,
  Category,
  CreateCategoryRequest,
  Link,
  CreateLinkRequest,
  WebsiteMetadata,
} from '@/types';

/**
 * API 基础 URL（可通过环境变量配置）
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * 创建 Axios 实例
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 自动添加 Token
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 统一错误处理
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    // Token 过期或无效，跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // 返回错误信息
    const message = error.response?.data?.message || '请求失败，请稍后重试';
    return Promise.reject(new Error(message));
  }
);

/**
 * 认证 API
 */
export const authAPI = {
  /**
   * 用户登录
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '登录失败');
    }
    return response.data.data;
  },

  /**
   * 用户注册
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '注册失败');
    }
    return response.data.data;
  },

  /**
   * 获取当前用户信息
   */
  getMe: async (): Promise<User> => {
    const response = await axiosInstance.get<ApiResponse<User>>('/auth/me');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '获取用户信息失败');
    }
    return response.data.data;
  },

  /**
   * 修改密码
   */
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    const response = await axiosInstance.put<ApiResponse>('/auth/password', data);
    if (!response.data.success) {
      throw new Error(response.data.message || '修改密码失败');
    }
  },
};

/**
 * 分类 API
 */
export const categoryAPI = {
  /**
   * 获取分类列表
   */
  getList: async (showAll = false): Promise<Category[]> => {
    const response = await axiosInstance.get<ApiResponse<Category[]>>('/categories', {
      params: { showAll },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '获取分类列表失败');
    }
    return response.data.data;
  },

  /**
   * 获取单个分类
   */
  getById: async (id: number): Promise<Category> => {
    const response = await axiosInstance.get<ApiResponse<Category>>(`/categories/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '获取分类详情失败');
    }
    return response.data.data;
  },

  /**
   * 创建分类
   */
  create: async (data: CreateCategoryRequest): Promise<Category> => {
    const response = await axiosInstance.post<ApiResponse<Category>>('/categories', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '创建分类失败');
    }
    return response.data.data;
  },

  /**
   * 更新分类
   */
  update: async (id: number, data: CreateCategoryRequest): Promise<Category> => {
    const response = await axiosInstance.put<ApiResponse<Category>>(`/categories/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '更新分类失败');
    }
    return response.data.data;
  },

  /**
   * 删除分类
   */
  delete: async (id: number): Promise<void> => {
    const response = await axiosInstance.delete<ApiResponse>(`/categories/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || '删除分类失败');
    }
  },

  /**
   * 切换分类可见性
   */
  toggleVisibility: async (id: number): Promise<{ id: number; isVisible: boolean }> => {
    const response = await axiosInstance.patch<ApiResponse<{ id: number; isVisible: boolean }>>(
      `/categories/${id}/visibility`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '切换可见性失败');
    }
    return response.data.data;
  },
};

/**
 * 链接 API
 */
export const linkAPI = {
  /**
   * 获取链接列表
   */
  getList: async (params?: {
    categoryId?: number;
    search?: string;
    showAll?: boolean;
  }): Promise<Link[]> => {
    const response = await axiosInstance.get<ApiResponse<Link[]>>('/links', { params });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '获取链接列表失败');
    }
    return response.data.data;
  },

  /**
   * 获取单个链接
   */
  getById: async (id: number): Promise<Link> => {
    const response = await axiosInstance.get<ApiResponse<Link>>(`/links/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '获取链接详情失败');
    }
    return response.data.data;
  },

  /**
   * 创建链接
   */
  create: async (data: CreateLinkRequest): Promise<Link> => {
    const response = await axiosInstance.post<ApiResponse<Link>>('/links', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '创建链接失败');
    }
    return response.data.data;
  },

  /**
   * 更新链接
   */
  update: async (id: number, data: CreateLinkRequest): Promise<Link> => {
    const response = await axiosInstance.put<ApiResponse<Link>>(`/links/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '更新链接失败');
    }
    return response.data.data;
  },

  /**
   * 删除链接
   */
  delete: async (id: number): Promise<void> => {
    const response = await axiosInstance.delete<ApiResponse>(`/links/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.message || '删除链接失败');
    }
  },

  /**
   * 切换链接可见性
   */
  toggleVisibility: async (id: number): Promise<{ id: number; isVisible: boolean }> => {
    const response = await axiosInstance.patch<ApiResponse<{ id: number; isVisible: boolean }>>(
      `/links/${id}/visibility`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '切换可见性失败');
    }
    return response.data.data;
  },

  /**
   * 记录链接点击
   */
  recordClick: async (id: number): Promise<void> => {
    // 不抛出错误，静默失败
    try {
      await axiosInstance.post(`/links/${id}/click`);
    } catch (error) {
      console.warn('记录点击失败:', error);
    }
  },

  /**
   * 解析网站元信息
   */
  parseUrl: async (url: string): Promise<WebsiteMetadata> => {
    const response = await axiosInstance.post<ApiResponse<WebsiteMetadata>>('/links/parse', {
      url,
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || '解析 URL 失败');
    }
    return response.data.data;
  },
};

export default axiosInstance;
