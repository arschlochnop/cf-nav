import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * 用户表 - 管理员账户信息
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // bcrypt 哈希后的密码
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * 分类表 - 链接分组
 */
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'), // 图标 URL 或 emoji
  sortOrder: integer('sort_order').notNull().default(0), // 排序权重
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * 链接表 - 导航链接信息
 */
export const links = sqliteTable('links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }), // 外键关联分类
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  icon: text('icon'), // 网站 favicon URL
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  clickCount: integer('click_count').notNull().default(0), // 点击统计
  // 监控配置字段（0001_add_monitor_fields.sql）
  isMonitored: integer('is_monitored', { mode: 'boolean' }).notNull().default(false), // 是否启用监控
  checkInterval: integer('check_interval').notNull().default(5), // 检测间隔（分钟）
  checkMethod: text('check_method').notNull().default('http_status'), // 检测方法：http_status, ping
  // 监控状态字段
  lastCheckedAt: integer('last_checked_at', { mode: 'timestamp' }), // 最后检测时间
  monitorStatus: text('monitor_status').notNull().default('unknown'), // 当前状态：up, down, slow, unknown
  responseTime: integer('response_time'), // 响应时间（毫秒）
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// TypeScript 类型推导
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
