import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Settings } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showAdminNav?: boolean;
}

/**
 * 通用布局组件
 */
export function Layout({ children, showHeader = true, showAdminNav = false }: LayoutProps) {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-primary-600">CF-Nav</h1>
              </Link>

              <nav className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <>
                    {!showAdminNav && (
                      <Link
                        to="/admin"
                        className="flex items-center space-x-1 text-gray-600 hover:text-primary-600 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>管理后台</span>
                      </Link>
                    )}
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">欢迎，{user?.username}</span>
                      <button
                        onClick={logout}
                        className="flex items-center space-x-1 px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>退出</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    登录
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </header>
      )}

      {showAdminNav && isAuthenticated && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-6 h-12">
              <Link to="/" className="flex items-center px-3 text-sm text-gray-600 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 transition-colors">
                前台首页
              </Link>
              <Link to="/admin" className="flex items-center px-3 text-sm text-primary-600 border-b-2 border-primary-600">
                链接管理
              </Link>
              <Link to="/admin/categories" className="flex items-center px-3 text-sm text-gray-600 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 transition-colors">
                分类管理
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Powered by{' '}
            <a
              href="https://www.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              Cloudflare Workers
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
