-- Migration: Create links table
-- Created: 2026-01-20
-- Description: 创建链接表,存储导航链接信息

CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    favicon TEXT,  -- 网站 favicon URL
    logo TEXT,  -- 网站 logo URL
    category_id INTEGER NOT NULL DEFAULT 0,
    order_num INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET DEFAULT
);

-- URL 唯一索引,防止重复添加
CREATE UNIQUE INDEX IF NOT EXISTS idx_links_url ON links(url);

-- 分类 ID 索引,优化按分类查询
CREATE INDEX IF NOT EXISTS idx_links_category_id ON links(category_id);

-- 排序索引,优化链接排序
CREATE INDEX IF NOT EXISTS idx_links_order ON links(order_num);

-- 复合索引,优化按分类查询并排序的场景
CREATE INDEX IF NOT EXISTS idx_links_category_order ON links(category_id, order_num);
