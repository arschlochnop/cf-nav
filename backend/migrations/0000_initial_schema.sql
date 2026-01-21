-- CF-Nav 数据库初始化脚本
-- 创建时间: 2026-01-20
-- 数据库类型: SQLite (Cloudflare D1)

-- ============================================
-- 1. 用户表 (users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 用户名唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 邮箱唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 2. 分类表 (categories)
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 排序索引（降序，用于首页展示）
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order DESC);

-- 可见性索引（用于前台筛选）
CREATE INDEX IF NOT EXISTS idx_categories_visible ON categories(is_visible) WHERE is_visible = 1;

-- ============================================
-- 3. 链接表 (links)
-- ============================================
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- 分类外键索引（用于查询某分类下的所有链接）
CREATE INDEX IF NOT EXISTS idx_links_category_id ON links(category_id);

-- 排序索引（降序，用于首页展示）
CREATE INDEX IF NOT EXISTS idx_links_sort_order ON links(sort_order DESC);

-- 可见性索引（用于前台筛选）
CREATE INDEX IF NOT EXISTS idx_links_visible ON links(is_visible) WHERE is_visible = 1;

-- 全文搜索索引（标题和描述）
CREATE INDEX IF NOT EXISTS idx_links_search_title ON links(title);
CREATE INDEX IF NOT EXISTS idx_links_search_desc ON links(description);

-- 点击量索引（用于热门链接排序）
CREATE INDEX IF NOT EXISTS idx_links_click_count ON links(click_count DESC);

-- 复合索引：分类+可见性+排序（优化首页查询）
CREATE INDEX IF NOT EXISTS idx_links_category_visible_sort
  ON links(category_id, is_visible, sort_order DESC)
  WHERE is_visible = 1;

-- ============================================
-- 4. 插入默认数据
-- ============================================

-- 默认管理员账号（密码：Admin@123，已经过 bcrypt 加密）
-- 注意：生产环境部署后请立即修改密码！
INSERT OR IGNORE INTO users (id, username, password, email) VALUES
(1, 'admin', '$2a$10$GZzaLbIlr4viIMuKZNf.OuSaLqhUGtpC9ma7qiGZxffrafdFDAZBK', 'admin@example.com');

-- 默认分类
INSERT OR IGNORE INTO categories (id, name, description, icon, sort_order, is_visible) VALUES
(1, '常用工具', '日常工作和生活中常用的在线工具', '🛠️', 1, 1),
(2, '开发资源', '编程开发相关的文档、工具和资源', '💻', 2, 1),
(3, '设计素材', '设计相关的素材网站和工具', '🎨', 3, 1),
(4, '学习平台', '在线学习和教育平台', '📚', 4, 1);

-- 默认示例链接
INSERT OR IGNORE INTO links (category_id, title, url, description, icon, sort_order, is_visible) VALUES
(1, 'Google', 'https://www.google.com', '全球最大的搜索引擎', 'https://www.google.com/favicon.ico', 1, 1),
(1, 'ChatGPT', 'https://chat.openai.com', 'OpenAI 开发的智能对话助手', 'https://chat.openai.com/favicon.ico', 2, 1),
(2, 'GitHub', 'https://github.com', '全球最大的代码托管平台', 'https://github.com/favicon.ico', 1, 1),
(2, 'Stack Overflow', 'https://stackoverflow.com', '开发者问答社区', 'https://stackoverflow.com/favicon.ico', 2, 1);

-- ============================================
-- 5. 数据库元信息
-- ============================================
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR REPLACE INTO _meta (key, value) VALUES
('schema_version', '1'),
('created_at', unixepoch()),
('last_migration', '0000_initial_schema.sql');
