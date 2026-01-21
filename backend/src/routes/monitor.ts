import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { links } from '../db/schema';

/**
 * 环境变量类型定义
 */
type Bindings = {
  DB: D1Database;
};

/**
 * 监控路由模块
 */
const monitor = new Hono<{ Bindings: Bindings }>();

/**
 * 时间轴数据项接口（单次检测记录）
 */
interface TimelineItem {
  timestamp: number; // Unix timestamp（秒）
  status: 'up' | 'down' | 'slow'; // 状态
  responseTime: number; // 响应时间（毫秒）
}

/**
 * 监控服务接口
 */
interface MonitorService {
  id: number;
  name: string; // 只返回名称，不返回 URL（隐私保护）
  uptimePercentage: number; // 在线率（0-100，保留 1 位小数）
  currentStatus: 'up' | 'down' | 'slow' | 'unknown';
  timeline: TimelineItem[]; // 最近 45 次检测记录
}

/**
 * 监控状态响应接口
 */
interface MonitorStatusResponse {
  overallStatus: 'operational' | 'partial' | 'down';
  services: MonitorService[];
  lastUpdated: number; // Unix timestamp（秒）
}

/**
 * GET /api/monitor/status - 获取所有监控服务的状态
 *
 * 功能说明：
 * - 公开访问，无需认证
 * - 返回所有启用监控的链接状态
 * - 只显示网站名称，不显示 URL（隐私保护）
 * - 返回最近 45 次检测记录用于时间轴可视化
 *
 * 响应格式：
 * {
 *   overallStatus: 'operational' | 'partial' | 'down',
 *   services: [
 *     {
 *       id: 1,
 *       name: 'Google 搜索',
 *       uptimePercentage: 100.0,
 *       currentStatus: 'up',
 *       timeline: [
 *         { timestamp: 1737465600, status: 'up', responseTime: 123 },
 *         ...
 *       ]
 *     }
 *   ],
 *   lastUpdated: 1737465600
 * }
 */
monitor.get('/status', async (c) => {
  try {
    const db = drizzle(c.env.DB);

    // 1. 查询所有启用监控的链接
    const monitoredLinks = await db
      .select({
        id: links.id,
        title: links.title,
        monitorStatus: links.monitorStatus,
      })
      .from(links)
      .where(eq(links.isMonitored, 1))
      .all();

    // 2. 为每个链接查询最近 45 次检测记录并计算在线率
    const services: MonitorService[] = await Promise.all(
      monitoredLinks.map(async (link) => {
        // 查询最近 45 条检测记录
        const logsResult = await c.env.DB.prepare(
          `SELECT checked_at, status, response_time
           FROM monitor_logs
           WHERE link_id = ?
           ORDER BY checked_at DESC
           LIMIT 45`
        )
          .bind(link.id)
          .all();

        const logs = logsResult.results as Array<{
          checked_at: number;
          status: string;
          response_time: number;
        }>;

        // 构建时间轴数据（从旧到新排序，用于前端展示）
        const timeline: TimelineItem[] = logs.reverse().map((log) => ({
          timestamp: log.checked_at,
          status: log.status as 'up' | 'down' | 'slow',
          responseTime: log.response_time,
        }));

        // 计算在线率（只统计 'up' 状态的记录）
        const upCount = logs.filter((log) => log.status === 'up').length;
        const totalCount = logs.length;
        const uptimePercentage =
          totalCount > 0 ? Math.round((upCount / totalCount) * 1000) / 10 : 0;

        return {
          id: link.id,
          name: link.title, // 只返回名称，不返回 URL
          uptimePercentage,
          currentStatus: (link.monitorStatus as 'up' | 'down' | 'slow' | 'unknown') || 'unknown',
          timeline,
        };
      })
    );

    // 3. 计算整体状态
    const downCount = services.filter((s) => s.currentStatus === 'down').length;
    const totalServices = services.length;

    let overallStatus: 'operational' | 'partial' | 'down';
    if (downCount === 0) {
      overallStatus = 'operational'; // 所有服务正常
    } else if (downCount < totalServices / 2) {
      overallStatus = 'partial'; // 部分服务异常（< 50%）
    } else {
      overallStatus = 'down'; // 大部分服务异常（>= 50%）
    }

    // 4. 返回响应
    const response: MonitorStatusResponse = {
      overallStatus,
      services,
      lastUpdated: Math.floor(Date.now() / 1000), // 当前 Unix timestamp（秒）
    };

    return c.json(response);
  } catch (error) {
    console.error('[Monitor] 获取监控状态失败:', error);
    return c.json(
      {
        success: false,
        message: '获取监控状态失败',
        code: 'MONITOR_ERROR',
      },
      500
    );
  }
});

export default monitor;
