-- Migration: Create categories table
-- Created: 2026-01-20
-- Description: 创建分类表,用于组织导航链接

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    icon TEXT,  -- Lucide 图标名称
    color TEXT,  -- 颜色代码 #RRGGBB
    order_num INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建分类名称唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 创建排序索引,优化分类列表查询
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(order_num);

-- 插入默认分类(ID=0 为特殊分类,不可删除)
INSERT INTO categories (id, name, icon, color, order_num)
VALUES (0, '默认分类', 'folder', '#6B7280', 0)
ON CONFLICT(id) DO NOTHING;
