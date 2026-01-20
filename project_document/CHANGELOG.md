# 变更日志

> **格式要求**: 严格遵循 `.claude/output-styles/bullet-points.md` 格式规范
> **提交规范**: 遵循 commitlint 规范（type(scope): subject）

## [2026-01-21]
### 修复
- fix(jwt): 修复 JWT 环境变量访问方式（Cloudflare Workers 兼容性）
  - backend/src/utils/jwt.ts - 重构为依赖注入模式，接受 secret 参数而非直接读取 process.env
  - backend/src/routes/auth.ts - 从 c.env.JWT_SECRET 读取密钥并传递给 JWT 工具函数
  - backend/src/middleware/auth.ts - 更新认证中间件从 c.env 读取环境变量

### 重构
- 暂无

## [2026-01-20]
### 新增
- feat(test): 创建测试基础设施配置文件
  - backend/vitest.config.ts - 后端 Vitest 配置 (Workers 环境/D1 数据库/覆盖率 80%)
  - frontend/vitest.config.ts - 前端 Vitest 配置 (jsdom 环境/Testing Library/覆盖率 80%)
  - frontend/playwright.config.ts - Playwright E2E 测试配置 (多浏览器/自动重试/自动启动服务器)
  - frontend/src/test/setup.ts - 测试环境设置文件 (Jest DOM/模拟浏览器 API)
- feat(database): 添加数据库初始化迁移文件
  - backend/migrations/0000_initial_schema.sql - 完整的数据库 schema (users/categories/links 表 + 索引 + 默认数据)
- feat(config): 添加后端环境变量配置模板
  - backend/.env.example - JWT_SECRET/ALLOWED_ORIGINS 等配置说明

- feat(config): 创建项目配置文件
  - .gitignore - Git 忽略规则
  - .env.example - 环境变量模板
  - .prettierrc - 代码格式化配置
  - .eslintrc.json - ESLint 配置
- feat(database): 创建数据库迁移文件
  - 0001_create_users_table.sql - 用户表及邮箱唯一索引
  - 0002_create_categories_table.sql - 分类表、索引和默认分类
  - 0003_create_links_table.sql - 链接表、索引和外键约束

### 修改
- chore(test): 添加测试脚本到 package.json
  - backend/package.json - 添加 test/test:watch/test:coverage/test:ui 脚本
  - frontend/package.json - 添加 test/test:watch/test:coverage/test:ui/test:e2e 相关脚本

### 修复
- fix(auth): 修复 JWT 密钥安全隐患
  - backend/src/utils/jwt.ts - 移除默认密钥，强制要求环境变量 JWT_SECRET
- fix(cors): 修复 CORS 配置过于宽松的安全问题
  - backend/src/index.ts - 从环境变量读取允许的域名列表，拒绝未授权请求

### 重构
- 暂无

## [2026-01-13]
### 新增
- feat(github): 添加完整的 GitHub 仓库管理设施
  - Issue 模板: bug_report.yml, feature_request.yml, skill_request.yml, question.yml
  - PR 模板: PULL_REQUEST_TEMPLATE.md
  - 贡献指南: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md
  - 自动化 Workflows:
    - ci.yml - CI 流水线 (lint, test, validate)
    - stale.yml - 自动清理过期 Issue/PR
    - welcome.yml - 欢迎新贡献者
    - auto-label.yml - 自动标签
    - release.yml - 发布自动化
    - sync-upstream.yml - 上游同步机制
  - Bot 配置: dependabot.yml
  - 标签定义: labels.yml
  - 赞助配置: FUNDING.yml

### 修改
- 暂无

### 修复
- 暂无

### 重构
- 暂无

---
*本文档由 Claude Code 自动维护，请勿手动编辑格式*
