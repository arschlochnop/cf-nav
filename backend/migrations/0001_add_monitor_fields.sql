-- Migration: 添加监控功能相关字段到 links 表
-- Author: Claude (老王)
-- Date: 2026-01-21
-- Description: 为 links 表添加监控配置和状态字段，支持网站可用性监控功能

-- 添加监控配置字段
ALTER TABLE links ADD COLUMN is_monitored INTEGER DEFAULT 0 NOT NULL CHECK(is_monitored IN (0, 1));
-- is_monitored: 是否启用监控（0=否，1=是）

ALTER TABLE links ADD COLUMN check_interval INTEGER DEFAULT 5 NOT NULL;
-- check_interval: 检测间隔（分钟），默认 5 分钟

ALTER TABLE links ADD COLUMN check_method TEXT DEFAULT 'http_status' NOT NULL CHECK(check_method IN ('http_status', 'ping'));
-- check_method: 检测方法（http_status=HTTP状态码检测，ping=Ping检测）

-- 添加监控状态字段
ALTER TABLE links ADD COLUMN last_checked_at INTEGER;
-- last_checked_at: 最后检测时间（Unix timestamp，秒级）

ALTER TABLE links ADD COLUMN monitor_status TEXT DEFAULT 'unknown' NOT NULL CHECK(monitor_status IN ('up', 'down', 'slow', 'unknown'));
-- monitor_status: 当前监控状态
--   - up: 在线（HTTP 200-299，响应时间 < 3秒）
--   - down: 离线（连接失败、超时、HTTP 4xx/5xx）
--   - slow: 响应慢（HTTP 200-299，但响应时间 >= 3秒）
--   - unknown: 未知（尚未检测或检测失败）

ALTER TABLE links ADD COLUMN response_time INTEGER;
-- response_time: 最后响应时间（毫秒）

-- 创建索引优化查询
CREATE INDEX idx_links_is_monitored ON links(is_monitored) WHERE is_monitored = 1;
-- 索引说明：只索引启用监控的链接，提升监控任务查询性能

-- 验证：查询所有启用监控的链接（测试索引）
-- SELECT id, title, url, is_monitored, monitor_status, last_checked_at
-- FROM links
-- WHERE is_monitored = 1;
