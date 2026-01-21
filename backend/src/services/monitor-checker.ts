/**
 * 监控检测服务
 * 用于定时检测网站可用性并记录结果
 */

interface MonitorLink {
  id: number;
  url: string;
  checkMethod: string;
}

interface CheckResult {
  linkId: number;
  status: 'up' | 'down' | 'slow';
  statusCode?: number;
  responseTime: number;
  errorMessage?: string;
}

/**
 * 执行单个链接的监控检测
 */
async function checkSingleLink(link: MonitorLink): Promise<CheckResult> {
  const startTime = Date.now();

  try {
    if (link.checkMethod === 'http_status') {
      // HTTP 状态检测
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 秒超时

      const response = await fetch(link.url, {
        method: 'HEAD', // 只获取响应头，不下载内容
        signal: controller.signal,
        headers: {
          'User-Agent': 'CF-Nav-Monitor/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // 判断状态
      let status: 'up' | 'down' | 'slow';
      if (response.ok) {
        // HTTP 200-299
        status = responseTime >= 3000 ? 'slow' : 'up';
      } else {
        // HTTP 4xx/5xx
        status = 'down';
      }

      return {
        linkId: link.id,
        status,
        statusCode: response.status,
        responseTime,
      };
    } else if (link.checkMethod === 'ping') {
      // Cloudflare Workers 不支持 ICMP Ping，使用 TCP 连接测试
      // 简化实现：使用 GET 请求测试连接性
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(link.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'CF-Nav-Monitor/1.0',
        },
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const status: 'up' | 'down' | 'slow' = response.ok
        ? responseTime >= 3000
          ? 'slow'
          : 'up'
        : 'down';

      return {
        linkId: link.id,
        status,
        statusCode: response.status,
        responseTime,
      };
    } else {
      throw new Error(`不支持的检测方法: ${link.checkMethod}`);
    }
  } catch (error) {
    // 检测失败（超时、连接失败、DNS 解析失败等）
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    return {
      linkId: link.id,
      status: 'down',
      responseTime,
      errorMessage,
    };
  }
}

/**
 * 执行监控检测任务（定时任务入口）
 */
export async function runMonitorCheck(db: D1Database): Promise<void> {
  console.log('[监控检测] 任务开始执行...', new Date().toISOString());

  try {
    // 1. 从数据库读取所有启用监控的链接
    const result = await db
      .prepare('SELECT id, url, check_method as checkMethod FROM links WHERE is_monitored = 1')
      .all<MonitorLink>();

    const monitoredLinks = result.results || [];
    console.log(`[监控检测] 找到 ${monitoredLinks.length} 个启用监控的链接`);

    if (monitoredLinks.length === 0) {
      console.log('[监控检测] 没有启用监控的链接，跳过检测');
      return;
    }

    // 2. 并发执行所有检测（提高效率）
    const checkPromises = monitoredLinks.map((link) => checkSingleLink(link));
    const checkResults = await Promise.all(checkPromises);

    console.log(`[监控检测] 完成 ${checkResults.length} 个链接的检测`);

    // 3. 批量更新数据库（使用事务提高性能）
    const updateStatements = checkResults.map((result) => {
      // 更新 links 表的监控状态
      const updateLinkStmt = db
        .prepare(
          `UPDATE links
           SET monitor_status = ?,
               response_time = ?,
               last_checked_at = ?
           WHERE id = ?`
        )
        .bind(
          result.status,
          result.responseTime,
          Math.floor(Date.now() / 1000), // Unix timestamp (秒)
          result.linkId
        );

      // 插入监控日志
      const insertLogStmt = db
        .prepare(
          `INSERT INTO monitor_logs (link_id, checked_at, status, status_code, response_time, error_message)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
          result.linkId,
          Math.floor(Date.now() / 1000), // Unix timestamp (秒)
          result.status,
          result.statusCode || null,
          result.responseTime,
          result.errorMessage || null
        );

      return [updateLinkStmt, insertLogStmt];
    });

    // 扁平化所有语句
    const allStatements = updateStatements.flat();

    // 批量执行（D1 batch API）
    await db.batch(allStatements);

    console.log('[监控检测] 数据库更新完成');

    // 4. 清理旧日志（保留最近 90 天）
    const cleanupResult = await db
      .prepare(
        `DELETE FROM monitor_logs
         WHERE checked_at < unixepoch('now', '-90 days')`
      )
      .run();

    if (cleanupResult.meta.changes > 0) {
      console.log(`[监控检测] 清理了 ${cleanupResult.meta.changes} 条过期日志`);
    }

    console.log('[监控检测] 任务执行成功 ✅');
  } catch (error) {
    console.error('[监控检测] 任务执行失败:', error);
    throw error;
  }
}
