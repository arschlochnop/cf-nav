import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/services/api';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

/**
 * 密码强度验证
 */
function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('密码长度至少8个字符');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('至少包含一个小写字母');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('至少包含一个大写字母');
  }

  if (!/\d/.test(password)) {
    errors.push('至少包含一个数字');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('至少包含一个特殊字符');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 修改密码页面
 */
export function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 实时验证新密码强度
  const passwordValidation = validatePasswordStrength(formData.newPassword);

  // 检查确认密码是否一致
  const passwordsMatch = formData.newPassword === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // 前端验证
    if (!passwordValidation.isValid) {
      setError('新密码强度不足');
      return;
    }

    if (!passwordsMatch) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (formData.oldPassword === formData.newPassword) {
      setError('新密码不能与旧密码相同');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.changePassword({
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      });

      setSuccess(true);
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // 3秒后跳转回管理页面
      setTimeout(() => {
        navigate('/admin');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">修改密码</h1>
          <p className="text-gray-600">为了账户安全，请定期修改密码</p>
        </div>

        {/* 成功提示 */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>密码修改成功！3秒后自动跳转...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-center space-x-2">
            <XCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 旧密码 */}
          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 mb-2">
              旧密码
            </label>
            <div className="relative">
              <input
                id="oldPassword"
                type={showPassword.old ? 'text' : 'password'}
                value={formData.oldPassword}
                onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="请输入旧密码"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, old: !showPassword.old })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.old ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
              新密码
            </label>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="请输入新密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 密码强度提示 */}
            {formData.newPassword && (
              <div className="mt-2 space-y-1">
                {passwordValidation.errors.map((err, index) => (
                  <p key={index} className="text-xs text-red-500 flex items-center space-x-1">
                    <XCircle className="w-3 h-3" />
                    <span>{err}</span>
                  </p>
                ))}
                {passwordValidation.isValid && (
                  <p className="text-xs text-green-500 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>密码强度符合要求</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 确认新密码 */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              确认新密码
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showPassword.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="请再次输入新密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 密码一致性提示 */}
            {formData.confirmPassword && (
              <div className="mt-2">
                {passwordsMatch ? (
                  <p className="text-xs text-green-500 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>两次密码输入一致</span>
                  </p>
                ) : (
                  <p className="text-xs text-red-500 flex items-center space-x-1">
                    <XCircle className="w-3 h-3" />
                    <span>两次密码输入不一致</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 按钮组 */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading || !passwordValidation.isValid || !passwordsMatch}
              className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
            >
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              <span>{isLoading ? '提交中...' : '确认修改'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回管理页面</span>
            </button>
          </div>
        </form>

        {/* 提示信息 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>密码要求：至少8个字符，包含大小写字母、数字和特殊字符</p>
        </div>
      </div>
    </div>
  );
}
