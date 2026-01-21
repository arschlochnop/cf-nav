import React from 'react';
import { UptimeTimeline } from './UptimeTimeline';
import { Activity, Wrench, Heart, Check, X } from 'lucide-react';

/**
 * 监控服务数据接口（与后端 API 响应格式一致）
 */
interface MonitorService {
  id: number;
  name: string; // 服务名称（不包含 URL，隐私保护）
  uptimePercentage: number; // 在线率（0-100，保留 1 位小数，基于最近45次）
  uptime24h: number; // 最近 24 小时在线率（0-100）
  uptime30d: number; // 最近 30 天在线率（0-100）
  avgResponseTime: number; // 平均响应时间（毫秒）
  lastResponseTime: number | null; // 最后一次响应时间（毫秒）
  currentStatus: 'up' | 'down' | 'slow' | 'unknown';
  timeline: Array<{
    timestamp: number; // Unix timestamp（秒）
    status: 'up' | 'down' | 'slow';
    responseTime: number; // 响应时间（毫秒）
  }>;
  lastCheckedAt: number | null; // 最后检测时间（Unix timestamp 秒），无检测记录时为 null
}

/**
 * MonitorServiceCard 组件属性
 */
interface MonitorServiceCardProps {
  service: MonitorService;
  isMobile?: boolean;
}

/**
 * 根据当前状态返回状态图标组件
 *
 * @param status 当前状态
 * @returns 状态图标（绿色✓ 或 红色✗）
 */
function getStatusIcon(status: string) {
  if (status === 'up') {
    return <Check className="w-6 h-6 text-green-500" />;
  } else if (status === 'down') {
    return <X className="w-6 h-6 text-red-500" />;
  } else if (status === 'slow') {
    return <Check className="w-6 h-6 text-yellow-500" />; // 慢速也用勾号，但黄色
  } else {
    return <X className="w-6 h-6 text-gray-400" />; // 未知状态用灰色叉号
  }
}

/**
 * MonitorServiceCard - 监控服务卡片组件（横向布局）
 *
 * 功能说明：
 * - 横向布局显示监控服务信息（状态、名称、响应时间、在线率、时间轴）
 * - 深色背景，圆角，阴影，Hover 时略微放大
 * - 左侧：状态图标（✓/✗）+ 服务名称
 * - 中左：Activity 图标 + 平均/最后响应时间
 * - 中右：Wrench 图标 + 24h/30d 在线率
 * - 右侧：Heart 图标 + 时间轴
 * - 使用 React.memo 优化性能，避免不必要的重渲染
 *
 * 设计规范：
 * - 背景色：深紫灰色 (bg-gray-800)
 * - 文字颜色：浅色 (text-gray-100, text-gray-300)
 * - 内边距：16px (p-4)
 * - 圆角：8px (rounded-lg)
 * - 阴影：md (shadow-md)
 * - Hover 效果：阴影加深 (shadow-lg)
 * - 过渡动画：300ms
 */
export const MonitorServiceCard = React.memo<MonitorServiceCardProps>(
  ({ service, isMobile = false }) => {
    return (
      <div
        className="
          bg-gray-800 rounded-lg shadow-md p-4
          transition-all duration-300 hover:shadow-lg
          border border-gray-700
        "
        role="article"
        aria-label={`${service.name} 监控状态卡片`}
      >
        {/* 横向布局：所有元素在一行 */}
        <div className="flex items-center justify-between gap-6">
          {/* 左侧：状态图标 + 服务名称 */}
          <div className="flex items-center gap-3 min-w-[200px]">
            {/* 状态图标 */}
            <div className="flex-shrink-0">
              {getStatusIcon(service.currentStatus)}
            </div>

            {/* 服务名称 */}
            <h3
              className="text-lg font-semibold text-gray-100 truncate"
              title={service.name}
            >
              {service.name}
            </h3>
          </div>

          {/* 中左：Activity 图标 + 平均/最后响应时间 */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <Activity className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <span className="font-medium">{service.avgResponseTime}ms</span>
              <span className="text-gray-500 mx-1">(avg)</span>
              <span className="mx-1">/</span>
              <span className="font-medium">
                {service.lastResponseTime !== null ? `${service.lastResponseTime}ms` : 'N/A'}
              </span>
              <span className="text-gray-500 mx-1">(last)</span>
            </div>
          </div>

          {/* 中右：Wrench 图标 + 24h/30d 在线率 */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <Wrench className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <span className="font-medium">{service.uptime24h.toFixed(2)}%</span>
              <span className="text-gray-500 mx-1">(24h)</span>
              <span className="mx-1">/</span>
              <span className="font-medium">{service.uptime30d.toFixed(2)}%</span>
              <span className="text-gray-500 mx-1">(30d)</span>
            </div>
          </div>

          {/* 右侧：Heart 图标 + 时间轴 */}
          <div className="flex items-center gap-3 flex-1">
            <Heart className="w-5 h-5 text-pink-400 flex-shrink-0" />
            <div className="flex-1">
              <UptimeTimeline timeline={service.timeline} isMobile={isMobile} />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// 设置 displayName 用于 React DevTools 调试（老王我规范的代码习惯）
MonitorServiceCard.displayName = 'MonitorServiceCard';
