import React from 'react';

/**
 * 时间轴数据项接口
 */
interface TimelineItem {
  timestamp: number; // Unix timestamp（秒）
  status: 'up' | 'down' | 'slow'; // 状态
  responseTime: number; // 响应时间（毫秒）
}

/**
 * UptimeTimeline 组件属性
 */
interface UptimeTimelineProps {
  timeline: TimelineItem[];
  isMobile?: boolean;
}

/**
 * 格式化时间戳为可读时间
 * @param timestamp Unix timestamp（秒）
 * @returns 格式化后的时间字符串（例如：2026-01-21 10:30:00）
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 状态映射为中文
 * @param status 状态（up/down/slow）
 * @returns 中文状态描述
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'up':
      return '在线';
    case 'down':
      return '离线';
    case 'slow':
      return '慢速';
    default:
      return '未知';
  }
}

/**
 * 状态映射为颜色类名
 * @param status 状态（up/down/slow）
 * @returns Tailwind CSS 背景颜色类名
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'up':
      return 'bg-green-500'; // 在线 - 绿色
    case 'down':
      return 'bg-red-500'; // 离线 - 红色
    case 'slow':
      return 'bg-yellow-500'; // 慢速 - 黄色
    default:
      return 'bg-gray-300'; // 未知 - 灰色
  }
}

/**
 * UptimeTimeline - 时间轴条形图组件（核心可视化元素）
 *
 * 功能说明：
 * - 显示最近 N 次检测结果（桌面端 45 个，移动端 30 个）
 * - 每个竖条代表一次检测，颜色表示状态（绿色=在线，红色=离线，黄色=慢速）
 * - Hover 显示详细信息（时间戳、状态、响应时间）
 * - 使用 React.memo 优化性能，避免不必要的重渲染
 *
 * 设计规范：
 * - 竖条宽度：4px (w-1)
 * - 竖条高度：40px (h-10)
 * - 竖条间距：4px (space-x-1)
 * - Hover 效果：放大 110%，添加阴影
 * - 过渡动画：200ms
 */
export const UptimeTimeline = React.memo<UptimeTimelineProps>(({ timeline, isMobile = false }) => {
  // 根据设备类型决定显示数量（移动端显示更少以适应小屏幕）
  const displayCount = isMobile ? 30 : 45;

  // 只取最近 N 条记录（从旧到新排序）
  const recentTimeline = timeline.slice(-displayCount);

  return (
    <div className="flex items-end space-x-1 h-10" role="list" aria-label="网站可用性时间轴">
      {recentTimeline.map((item, index) => (
        <div
          key={`${item.timestamp}-${index}`}
          className={`
            w-1 h-10 rounded-sm cursor-pointer
            transition-all duration-200 hover:scale-110 hover:shadow-lg
            ${getStatusColor(item.status)}
          `}
          title={`${formatTime(item.timestamp)} - ${getStatusText(item.status)} - ${item.responseTime}ms`}
          role="listitem"
          aria-label={`${formatTime(item.timestamp)}, 状态: ${getStatusText(item.status)}, 响应时间: ${item.responseTime}毫秒`}
        />
      ))}
    </div>
  );
});

// 设置 displayName 用于 React DevTools 调试
UptimeTimeline.displayName = 'UptimeTimeline';
