#!/bin/bash

# ============================================
# CF-Nav 一键部署脚本
# ============================================
# 这个憨批脚本能帮你快速部署到 Cloudflare
# 包括后端 Workers 和前端 Pages 的完整部署
# ============================================

set -e  # 遇到错误立即停止，别tm继续瞎跑

# 颜色输出（老王喜欢花里胡哨的）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# 检查必要的命令
check_requirements() {
    info "检查环境依赖..."

    if ! command -v node &> /dev/null; then
        error "艹！Node.js 没装，赶紧去装一个！"
    fi

    if ! command -v npm &> /dev/null; then
        error "艹！npm 没装，这个SB怎么开发的？"
    fi

    if ! command -v npx &> /dev/null; then
        error "艹！npx 没装，npm 都有了怎么没 npx？"
    fi

    info "✓ 环境检查通过"
}

# 部署后端
deploy_backend() {
    info "==================== 开始部署后端 ===================="

    cd backend || error "艹！backend 目录不存在，这项目结构有问题！"

    # 安装依赖
    info "安装后端依赖..."
    npm install || error "艹！npm install 失败，网络有问题还是配置有问题？"

    # 检查 D1 数据库
    info "检查 D1 数据库..."
    DB_EXISTS=$(npx wrangler d1 list | grep -c "cf-nav-db" || true)

    if [ "$DB_EXISTS" -eq 0 ]; then
        warn "数据库不存在，正在创建..."
        npx wrangler d1 create cf-nav-db || error "艹！创建数据库失败！"
        warn "⚠️ 请将数据库 ID 添加到 wrangler.toml 的 [[d1_databases]] 配置中！"
        warn "⚠️ 添加完成后，重新运行此脚本！"
        exit 1
    else
        info "✓ 数据库已存在"
    fi

    # 执行数据库迁移
    info "执行数据库迁移..."
    npx wrangler d1 migrations apply cf-nav-db --remote || error "艹！数据库迁移失败！"

    # 检查 JWT_SECRET
    info "检查环境变量..."
    if ! npx wrangler secret list | grep -q "JWT_SECRET"; then
        warn "⚠️ JWT_SECRET 未设置！"
        read -p "请输入 JWT_SECRET（按回车使用随机生成）: " jwt_secret

        if [ -z "$jwt_secret" ]; then
            jwt_secret=$(openssl rand -base64 32)
            info "生成随机密钥: $jwt_secret"
        fi

        echo "$jwt_secret" | npx wrangler secret put JWT_SECRET || error "艹！设置 JWT_SECRET 失败！"
    else
        info "✓ JWT_SECRET 已设置"
    fi

    # 部署 Workers
    info "部署后端到 Cloudflare Workers..."
    npm run deploy || error "艹！Workers 部署失败！"

    info "✓ 后端部署完成！"

    cd ..
}

# 部署前端
deploy_frontend() {
    info "==================== 开始部署前端 ===================="

    cd frontend || error "艹！frontend 目录不存在，这项目结构有问题！"

    # 安装依赖
    info "安装前端依赖..."
    npm install || error "艹！npm install 失败，网络有问题还是配置有问题？"

    # 检查环境变量
    if [ ! -f .env ]; then
        warn "⚠️ .env 文件不存在，从模板创建..."
        if [ -f .env.example ]; then
            cp .env.example .env
            warn "⚠️ 请编辑 .env 文件，设置正确的 VITE_API_BASE_URL！"
            read -p "按回车继续..."
        else
            error "艹！.env.example 也不存在，这项目配置有问题！"
        fi
    fi

    # 构建前端
    info "构建前端..."
    npm run build || error "艹！前端构建失败！"

    # 部署到 Pages
    info "部署前端到 Cloudflare Pages..."
    if command -v wrangler &> /dev/null; then
        npx wrangler pages deploy dist --project-name=cf-nav || {
            warn "wrangler pages deploy 失败，请手动部署："
            warn "1. 登录 Cloudflare Dashboard"
            warn "2. 进入 Pages 项目设置"
            warn "3. 上传 frontend/dist 目录"
        }
    else
        warn "未安装 wrangler，请手动部署："
        warn "1. 登录 Cloudflare Dashboard"
        warn "2. 进入 Pages 项目设置"
        warn "3. 上传 frontend/dist 目录"
    fi

    info "✓ 前端部署完成！"

    cd ..
}

# 主函数
main() {
    info "==================== CF-Nav 一键部署 ===================="
    info "这个脚本会帮你部署后端和前端到 Cloudflare"
    info "确保你已经登录 Cloudflare（wrangler login）"
    echo ""

    read -p "继续部署？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "部署已取消"
        exit 0
    fi

    check_requirements

    # 选择部署内容
    echo ""
    echo "请选择部署内容："
    echo "1) 仅部署后端"
    echo "2) 仅部署前端"
    echo "3) 部署后端和前端"
    read -p "请输入选项 (1-3): " choice

    case $choice in
        1)
            deploy_backend
            ;;
        2)
            deploy_frontend
            ;;
        3)
            deploy_backend
            deploy_frontend
            ;;
        *)
            error "艹！无效选项！"
            ;;
    esac

    echo ""
    info "==================== 部署完成 ===================="
    info "后端地址: https://cf-nav-backend.YOUR-SUBDOMAIN.workers.dev"
    info "前端地址: https://cf-nav.pages.dev"
    info "默认管理员账号: admin / Admin@123"
    warn "⚠️ 请立即修改默认管理员密码！"
}

# 执行主函数
main
