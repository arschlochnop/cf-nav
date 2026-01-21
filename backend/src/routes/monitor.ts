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
  uptimePercentage: number; // 在线率（0-100，保留 1 位小数，基于最近45次检测）
  uptime24h: number; // 最近 24 小时在线率（0-100，保留 1 位小数）
  uptime30d: number; // 最近 30 天在线率（0-100，保留 1 位小数）
  avgResponseTime: number; // 平均响应时间（毫秒，基于最近45次检测）
  lastResponseTime: number | null; // 最后一次响应时间（毫秒），无检测记录时为 null
  currentStatus: 'up' | 'down' | 'slow' | 'unknown';
  timeline: TimelineItem[]; // 最近 45 次检测记录
  lastCheckedAt: number | null; // 最后检测时间（Unix timestamp 秒），无检测记录时为 null
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

    // 2. 为每个链接查询检测记录并计算各项指标
    const services: MonitorService[] = await Promise.all(
      monitoredLinks.map(async (link) => {
        // 查询最近 45 条检测记录（用于时间轴显示和基础在线率）
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

        // 计算基础在线率（基于最近 45 次检测）
        const upCount = logs.filter((log) => log.status === 'up').length;
        const totalCount = logs.length;
        const uptimePercentage =
          totalCount > 0 ? Math.round((upCount / totalCount) * 1000) / 10 : 0;

        // 查询最近 24 小时的检测记录（用于 24h 在线率）
        const now = Math.floor(Date.now() / 1000); // 当前 Unix timestamp（秒）
        const timestamp24h = now - 24 * 60 * 60; // 24 小时前
        const logs24hResult = await c.env.DB.prepare(
          `SELECT status
           FROM monitor_logs
           WHERE link_id = ? AND checked_at >= ?`
        )
          .bind(link.id, timestamp24h)
          .all();

        const logs24h = logs24hResult.results as Array<{ status: string }>;
        const up24hCount = logs24h.filter((log) => log.status === 'up').length;
        const total24hCount = logs24h.length;
        const uptime24h =
          total24hCount > 0 ? Math.round((up24hCount / total24hCount) * 1000) / 10 : 0;

        // 查询最近 30 天的检测记录（用于 30d 在线率）
        const timestamp30d = now - 30 * 24 * 60 * 60; // 30 天前
        const logs30dResult = await c.env.DB.prepare(
          `SELECT status
           FROM monitor_logs
           WHERE link_id = ? AND checked_at >= ?`
        )
          .bind(link.id, timestamp30d)
          .all();

        const logs30d = logs30dResult.results as Array<{ status: string }>;
        const up30dCount = logs30d.filter((log) => log.status === 'up').length;
        const total30dCount = logs30d.length;
        const uptime30d =
          total30dCount > 0 ? Math.round((up30dCount / total30dCount) * 1000) / 10 : 0;

        // 计算平均响应时间（基于最近 45 次检测，只统计 up 和 slow 状态）
        const validResponseTimes = logs
          .filter((log) => log.status === 'up' || log.status === 'slow')
          .map((log) => log.response_time);
        const avgResponseTime =
          validResponseTimes.length > 0
            ? Math.round(
                validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
              )
            : 0;

        // 获取最后一次响应时间（timeline 已经从旧到新排序，取最后一个有效记录）
        const lastLog = timeline.length > 0 ? timeline[timeline.length - 1] : null;
        const lastResponseTime = lastLog ? lastLog.responseTime : null;

        // 获取最后检测时间
        const lastCheckedAt = lastLog ? lastLog.timestamp : null;

        return {
          id: link.id,
          name: link.title, // 只返回名称，不返回 URL
          uptimePercentage,
          uptime24h,
          uptime30d,
          avgResponseTime,
          lastResponseTime,
          currentStatus: (link.monitorStatus as 'up' | 'down' | 'slow' | 'unknown') || 'unknown',
          timeline,
          lastCheckedAt,
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
