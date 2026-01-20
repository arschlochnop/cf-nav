import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { authAPI } from '@/services/api';
import type { LoginRequest, RegisterRequest } from '@/types';

/**
 * 认证 Hook
 * 封装登录、注册、登出等认证相关操作
 */
export function useAuth() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  /**
   * 登录
   */
  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authAPI.login(credentials);
      setAuth(response.token, response.user);
      navigate('/admin');
      return response;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 注册
   */
  const register = async (data: RegisterRequest) => {
    try {
      const response = await authAPI.register(data);
      setAuth(response.token, response.user);
      navigate('/admin');
      return response;
    } catch (error) {
      throw error;
    }
  };

  /**
   * 登出
   */
  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  /**
   * 验证 Token 有效性
   */
  const validateToken = async () => {
    if (!token) return false;

    try {
      await authAPI.getMe();
      return true;
    } catch (error) {
      clearAuth();
      return false;
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    validateToken,
  };
}
