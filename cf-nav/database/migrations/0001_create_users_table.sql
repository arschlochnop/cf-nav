-- Migration: Create users table
-- Created: 2026-01-20
-- Description: 创建用户表,存储管理员账号信息

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,  -- bcrypt 加密存储
    nickname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建邮箱唯一索引,优化登录查询
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
