import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

/**
 * 认证状态接口
 */
interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // 方法
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

/**
 * 认证状态管理
 * 使用 Zustand + persist 实现持久化
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,

      // 设置认证信息
      setAuth: (token: string, user: User) => {
        // 同时存储到 localStorage（备用）
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      // 清除认证信息
      clearAuth: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },

      // 更新用户信息
      updateUser: (userData: Partial<User>) => {
        set((state) => {
          if (!state.user) return state;

          const updatedUser = { ...state.user, ...userData };
          localStorage.setItem('user', JSON.stringify(updatedUser));

          return {
            user: updatedUser,
          };
        });
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
