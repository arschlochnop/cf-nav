# 开发工作文档

> **格式要求**: 严格遵循 `.claude/output-styles/bullet-points.md` 格式规范

## 当前任务
- [x] GitHub 仓库管理设施搭建

## 任务详情
- GitHub 仓库管理设施
  - 状态: 已完成
  - 文件: `.github/` 目录
  - 描述: 完整的 GitHub 仓库管理基础设施

## 最近完成
- [2026-01-20] CF-Nav 项目初始化和数据库设计
  - 项目配置文件 (.gitignore, .env.example, .prettierrc, .eslintrc.json)
  - 数据库迁移文件
    - 0001_create_users_table.sql (用户表)
    - 0002_create_categories_table.sql (分类表)
    - 0003_create_links_table.sql (链接表)
  - 索引优化 (email唯一索引、分类排序索引、链接URL唯一索引、复合索引)

- [2026-01-13] GitHub 仓库管理设施搭建
  - Issue 模板系统 (Bug报告、功能请求、Skill请求、问题咨询)
  - PR 模板和贡献指南
  - 自动化 Workflows (CI、Stale、Welcome、Auto-label、Release、Sync-upstream)
  - Bot 配置 (Dependabot)
  - 上游同步机制
  - 安全政策和行为准则

## 遇到的问题
- 暂无

## 技术决策
- 使用 GitHub Actions 实现 CI/CD 和自动化
- 采用 YAML 格式的 Issue 模板以获得更好的表单体验
- 上游同步采用 PR 方式而非直接合并，避免冲突

---
*本文档由 Claude Code 自动维护，请勿手动编辑格式*
