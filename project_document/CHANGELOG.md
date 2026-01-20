# 变更日志

> **格式要求**: 严格遵循 `.claude/output-styles/bullet-points.md` 格式规范
> **提交规范**: 遵循 commitlint 规范（type(scope): subject）

## [2026-01-20]
### 新增
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
- 暂无

### 修复
- 暂无

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
