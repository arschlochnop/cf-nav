import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MonitorServiceCard } from '../components/monitor/MonitorServiceCard';
import { AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatLastUpdated } from '../utils/timeFormat';

/**
 * 时间轴数据项接口
 */
interface TimelineItem {
  timestamp: number; // Unix timestamp（秒）
  status: 'up' | 'down' | 'slow';
  responseTime: number; // 响应时间（毫秒）
}

/**
 * 监控服务接口
 */
interface MonitorService {
  id: number;
  name: string; // 服务名称（不包含 URL）
  uptimePercentage: number; // 在线率（0-100，基于最近45次检测）
  uptime24h: number; // 最近 24 小时在线率（0-100）
  uptime30d: number; // 最近 30 天在线率（0-100）
  avgResponseTime: number; // 平均响应时间（毫秒）
  lastResponseTime: number | null; // 最后一次响应时间（毫秒）
  currentStatus: 'up' | 'down' | 'slow' | 'unknown';
  timeline: TimelineItem[];
  lastCheckedAt: number | null; // 最后检测时间（Unix timestamp 秒）
}

/**
 * API 响应接口
 */
interface MonitorStatusResponse {
  overallStatus: 'operational' | 'partial' | 'down';
  services: MonitorService[];
  lastUpdated: number; // Unix timestamp（秒）
}

/**
 * 获取整体状态的颜色类名
 *
 * @param status 整体状态
 * @returns Tailwind CSS 颜色类名
 */
function getOverallStatusColor(status: string): string {
  switch (status) {
    case 'operational':
      return 'bg-green-50 border-green-200 text-green-800'; // 全部正常 - 绿色
    case 'partial':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'; // 部分异常 - 黄色
    case 'down':
      return 'bg-red-50 border-red-200 text-red-800'; // 大部分异常 - 红色
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800'; // 未知 - 灰色
  }
}

/**
 * 获取整体状态的图标组件
 *
 * @param status 整体状态
 * @returns Lucide React 图标组件
 */
function getOverallStatusIcon(status: string) {
  const iconProps = { className: 'w-6 h-6 mr-2' };

  switch (status) {
    case 'operational':
      return <CheckCircle {...iconProps} className="w-6 h-6 mr-2 text-green-600" />; // 全部正常 - 勾号
    case 'partial':
      return <AlertTriangle {...iconProps} className="w-6 h-6 mr-2 text-yellow-600" />; // 部分异常 - 警告
    case 'down':
      return <AlertCircle {...iconProps} className="w-6 h-6 mr-2 text-red-600" />; // 大部分异常 - 错误
    default:
      return <AlertCircle {...iconProps} className="w-6 h-6 mr-2 text-gray-600" />; // 未知 - 错误
  }
}

/**
 * 获取整体状态的中文文本
 *
 * @param status 整体状态
 * @returns 中文状态描述
 */
function getOverallStatusText(status: string): string {
  switch (status) {
    case 'operational':
      return '所有系统正常运行';
    case 'partial':
      return '部分系统出现异常';
    case 'down':
      return '大部分系统离线';
    default:
      return '系统状态未知';
  }
}


/**
 * OverallStatusBanner - 整体状态横幅组件
 *
 * 功能说明：
 * - 显示所有监控服务的整体状态（全部正常、部分异常、大部分异常）
 * - 显示最后更新时间
 * - 根据状态显示不同的颜色和图标
 *
 * 设计规范：
 * - 宽度：100%（w-full）
 * - 内边距：16px（p-4）
 * - 圆角：8px（rounded-lg）
 * - 边框：2px（border-2）
 * - 阴影：sm（shadow-sm）
 */
const OverallStatusBanner: React.FC<{
  status: 'operational' | 'partial' | 'down';
  lastUpdated: number;
}> = ({ status, lastUpdated }) => {
  return (
    <div
      className={`
        w-full p-4 rounded-lg border-2 shadow-sm
        ${getOverallStatusColor(status)}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        {/* 左侧：图标 + 状态文本 */}
        <div className="flex items-center">
          {getOverallStatusIcon(status)}
          <div>
            <h2 className="text-xl font-bold">{getOverallStatusText(status)}</h2>
            <p className="text-sm mt-1">最后更新：{formatLastUpdated(lastUpdated)}</p>
          </div>
        </div>

        {/* 右侧：刷新图标（可选） */}
        <RefreshCw className="w-5 h-5 opacity-50" />
      </div>
    </div>
  );
};

/**
 * MonitorStatusPage - 监控状态页面（主页面）
 *
 * 功能说明：
 * - 公开访问，无需认证
 * - 使用 React Query 自动刷新数据（每 30 秒）
 * - 显示整体状态横幅（OverallStatusBanner）
 * - 显示所有监控服务的卡片列表（MonitorServiceCard × N）
 * - Skeleton 加载状态
 * - 错误处理
 * - 移动端响应式设计
 *
 * 设计规范：
 * - 最大宽度：1200px (max-w-7xl)
 * - 水平居中：mx-auto
 * - 顶部外边距：32px (mt-8)
 * - 左右内边距：16px (px-4)
 * - 服务卡片间距：16px (space-y-4)
 * - 移动端适配：自动检测窗口宽度（< 768px）
 */
export const MonitorStatusPage: React.FC = () => {
  // 移动端检测（窗口宽度 < 768px）
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // 初始检测
    checkMobile();

    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 使用 React Query 获取监控状态数据
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MonitorStatusResponse>({
    queryKey: ['monitorStatus'],
    queryFn: async () => {
      // 使用环境变量配置 API 地址，生产环境通过 VITE_API_BASE_URL 设置
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cf-nav-backend.kind-me7262.workers.dev/api';
      const response = await fetch(`${API_BASE_URL}/monitor/status`);

      if (!response.ok) {
        throw new Error('获取监控状态失败');
      }

      return response.json();
    },
    refetchInterval: 30000, // 每 30 秒自动刷新
    staleTime: 25000, // 25 秒内认为数据新鲜
    retry: 3, // 失败后重试 3 次
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">系统监控状态</h1>
          <p className="text-gray-600 mt-2">实时监控所有服务的可用性状态</p>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="max-w-7xl mx-auto px-4 mt-8 pb-12">
        {/* 加载状态（Skeleton） */}
        {isLoading && (
          <div className="space-y-6">
            {/* Skeleton - 整体状态横幅 */}
            <div className="w-full h-24 bg-gray-200 animate-pulse rounded-lg"></div>

            {/* Skeleton - 服务卡片列表 */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-40 bg-gray-200 animate-pulse rounded-lg"></div>
            ))}
          </div>
        )}

        {/* 错误状态 */}
        {isError && (
          <div
            className="bg-red-50 border-2 border-red-200 text-red-800 p-6 rounded-lg"
            role="alert"
          >
            <div className="flex items-center mb-2">
              <AlertCircle className="w-6 h-6 mr-2 text-red-600" />
              <h3 className="text-lg font-bold">加载失败</h3>
            </div>
            <p className="text-sm mb-4">
              {error instanceof Error ? error.message : '未知错误'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 数据加载成功 */}
        {data && (
          <div className="space-y-6">
            {/* 整体状态横幅 */}
            <OverallStatusBanner
              status={data.overallStatus}
              lastUpdated={data.lastUpdated}
            />

            {/* 服务卡片列表 */}
            {data.services.length === 0 ? (
              // 空状态提示
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  暂无监控服务
                </h3>
                <p className="text-gray-500">
                  请在管理后台启用网站监控功能
                </p>
              </div>
            ) : (
              // 服务卡片列表布局（纵向显示）
              <div className="flex flex-col gap-6">
                {data.services.map((service: MonitorService) => (
                  <MonitorServiceCard
                    key={service.id}
                    service={service}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 页面底部说明 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>监控数据每 30 秒自动刷新 • 数据来源：CF-Nav 监控系统</p>
        </div>
      </footer>
    </div>
  );
};

export default MonitorStatusPage;
