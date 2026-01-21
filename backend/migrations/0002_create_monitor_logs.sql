-- Migration: 创建监控日志表
-- Author: Claude (老王)
-- Date: 2026-01-21
-- Description: 创建 monitor_logs 表用于存储网站可用性检测记录，支持时间轴可视化

-- 创建监控日志表
CREATE TABLE monitor_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL,
  checked_at INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('up', 'down', 'slow')),
  status_code INTEGER,
  response_time INTEGER,
  error_message TEXT,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
);

-- 字段说明：
-- id: 主键（自增）
-- link_id: 链接 ID（外键，关联 links 表）
-- checked_at: 检测时间（Unix timestamp，秒级）
-- status: 检测状态
--   - up: 在线（HTTP 200-299，响应时间 < 3秒）
--   - down: 离线（连接失败、超时、HTTP 4xx/5xx）
--   - slow: 响应慢（HTTP 200-299，但响应时间 >= 3秒）
-- status_code: HTTP 状态码（可选，如 200、404、500）
-- response_time: 响应时间（毫秒）
-- error_message: 错误信息（可选，仅在检测失败时记录）

-- 创建索引优化查询
CREATE INDEX idx_monitor_logs_link_id ON monitor_logs(link_id);
-- 索引说明：按链接 ID 查询日志时使用（常用查询：获取某个链接的历史记录）

CREATE INDEX idx_monitor_logs_checked_at ON monitor_logs(checked_at DESC);
-- 索引说明：按时间倒序查询时使用（常用查询：获取最近 N 次检测记录）

CREATE INDEX idx_monitor_logs_link_checked ON monitor_logs(link_id, checked_at DESC);
-- 索引说明：复合索引，优化"获取某链接最近 N 次记录"的查询（核心查询）

-- 验证：查询某个链接最近 45 次检测记录（测试索引）
-- SELECT id, checked_at, status, status_code, response_time
-- FROM monitor_logs
-- WHERE link_id = 1
-- ORDER BY checked_at DESC
-- LIMIT 45;

-- 数据保留策略（可选，后续可通过 Cron 实现）：
-- 每个链接只保留最近 90 天的记录，避免数据库膨胀
-- DELETE FROM monitor_logs
-- WHERE checked_at < unixepoch('now', '-90 days');
