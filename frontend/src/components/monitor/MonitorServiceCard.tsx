import React from 'react';
import { UptimeTimeline } from './UptimeTimeline';

/**
 * 监控服务数据接口（与后端 API 响应格式一致）
 */
interface MonitorService {
  id: number;
  name: string; // 服务名称（不包含 URL，隐私保护）
  uptimePercentage: number; // 在线率（0-100，保留 1 位小数）
  currentStatus: 'up' | 'down' | 'slow' | 'unknown';
  timeline: Array<{
    timestamp: number; // Unix timestamp（秒）
    status: 'up' | 'down' | 'slow';
    responseTime: number; // 响应时间（毫秒）
  }>;
}

/**
 * MonitorServiceCard 组件属性
 */
interface MonitorServiceCardProps {
  service: MonitorService;
  isMobile?: boolean;
}

/**
 * 根据在线率返回徽章颜色类名
 *
 * 颜色规则（老王我定的标准）：
 * - >=99.5%: 深绿色（优秀）
 * - >=95.0%: 浅绿色（良好）
 * - >=90.0%: 黄色（警告）
 * - <90.0%: 红色（危险）
 *
 * @param percentage 在线率（0-100）
 * @returns Tailwind CSS 背景颜色类名
 */
function getUptimeBadgeColor(percentage: number): string {
  if (percentage >= 99.5) {
    return 'bg-green-500 text-white'; // 优秀 - 深绿色
  } else if (percentage >= 95.0) {
    return 'bg-lime-500 text-white'; // 良好 - 浅绿色
  } else if (percentage >= 90.0) {
    return 'bg-yellow-500 text-black'; // 警告 - 黄色（黑色文字提高对比度）
  } else {
    return 'bg-red-500 text-white'; // 危险 - 红色
  }
}

/**
 * 根据当前状态返回状态指示器颜色
 *
 * @param status 当前状态
 * @returns Tailwind CSS 背景颜色类名
 */
function getCurrentStatusColor(status: string): string {
  switch (status) {
    case 'up':
      return 'bg-green-500'; // 在线 - 绿色
    case 'down':
      return 'bg-red-500'; // 离线 - 红色
    case 'slow':
      return 'bg-yellow-500'; // 慢速 - 黄色
    default:
      return 'bg-gray-400'; // 未知 - 灰色
  }
}

/**
 * 根据当前状态返回中文文本
 *
 * @param status 当前状态
 * @returns 中文状态描述
 */
function getCurrentStatusText(status: string): string {
  switch (status) {
    case 'up':
      return '在线';
    case 'down':
      return '离线';
    case 'slow':
      return '响应慢';
    default:
      return '未知';
  }
}

/**
 * MonitorServiceCard - 监控服务卡片组件
 *
 * 功能说明：
 * - 显示单个服务的监控信息（名称、在线率、时间轴）
 * - 白色背景，圆角，阴影，Hover 时放大效果
 * - 顶部：服务名称（左）+ 在线率徽章（右）
 * - 中部：当前状态指示器（小圆点 + 文字）
 * - 底部：嵌入 UptimeTimeline 时间轴组件
 * - 使用 React.memo 优化性能，避免不必要的重渲染
 *
 * 设计规范：
 * - 卡片内边距：16px (p-4)
 * - 卡片圆角：8px (rounded-lg)
 * - 卡片阴影：md (shadow-md)
 * - Hover 效果：放大 102%，阴影加深 (shadow-lg)
 * - 过渡动画：300ms
 * - 徽章圆角：9999px (rounded-full)
 * - 徽章内边距：上下 4px，左右 12px (px-3 py-1)
 * - 徽章字体：加粗 (font-bold)
 */
export const MonitorServiceCard = React.memo<MonitorServiceCardProps>(
  ({ service, isMobile = false }) => {
    return (
      <div
        className="
          bg-white rounded-lg shadow-md p-4
          transition-all duration-300 hover:scale-102 hover:shadow-lg
          border border-gray-100
        "
        role="article"
        aria-label={`${service.name} 监控状态卡片`}
      >
        {/* 顶部：服务名称 + 在线率徽章 */}
        <div className="flex items-center justify-between mb-3">
          {/* 服务名称（只显示名称，不显示 URL，老王我保护隐私） */}
          <h3 className="text-lg font-semibold text-gray-800 truncate max-w-[60%]" title={service.name}>
            {service.name}
          </h3>

          {/* 在线率徽章（颜色根据百分比动态变化） */}
          <span
            className={`
              px-3 py-1 rounded-full text-sm font-bold
              ${getUptimeBadgeColor(service.uptimePercentage)}
            `}
            aria-label={`在线率 ${service.uptimePercentage} 百分点`}
          >
            {service.uptimePercentage.toFixed(1)}%
          </span>
        </div>

        {/* 中部：当前状态指示器（小圆点 + 文字） */}
        <div className="flex items-center mb-4">
          {/* 状态指示器圆点（实时状态） */}
          <span
            className={`
              w-3 h-3 rounded-full mr-2
              ${getCurrentStatusColor(service.currentStatus)}
            `}
            aria-label={`当前状态: ${getCurrentStatusText(service.currentStatus)}`}
          ></span>

          {/* 状态文字 */}
          <span className="text-sm text-gray-600">
            {getCurrentStatusText(service.currentStatus)}
          </span>
        </div>

        {/* 底部：时间轴组件（显示最近 45 次检测记录） */}
        <div className="mt-4">
          <UptimeTimeline timeline={service.timeline} isMobile={isMobile} />
        </div>

        {/* 时间轴说明文字（桌面端显示，移动端隐藏） */}
        {!isMobile && (
          <div className="mt-2 text-xs text-gray-400 text-right">
            最近 45 次检测记录
          </div>
        )}
      </div>
    );
  }
);

// 设置 displayName 用于 React DevTools 调试（老王我规范的代码习惯）
MonitorServiceCard.displayName = 'MonitorServiceCard';
