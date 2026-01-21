# 监控功能本地测试指南

> **目标**: 验证监控页面功能是否正常工作

---

## 1️⃣ 前置准备

### 确认环境变量配置
```bash
# 检查 backend/.env 文件是否包含必要配置
cat backend/.env | grep -E "(JWT_SECRET|DATABASE)"
```

### 确认数据库 migrations 已执行
```bash
# 进入 backend 目录
cd backend

# 查看现有 migrations
ls -la migrations/

# 应该看到以下文件：
# - 0000_initial_schema.sql
# - 0001_add_monitor_fields.sql ✅（监控字段）
# - 0002_create_monitor_logs.sql ✅（监控日志表）
```

---

## 2️⃣ 启动开发服务器

### Terminal 1: 启动后端服务器
```bash
cd backend
npm run dev

# 预期输出：
# ⛅️ wrangler 3.x.x
# ⎔ Starting local server...
# ⎔ Ready on http://localhost:8787
```

### Terminal 2: 启动前端服务器
```bash
cd frontend
npm run dev

# 预期输出：
# VITE v5.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

---

## 3️⃣ 测试后端 API

### 测试监控状态接口
```bash
# 方法1: 使用 curl
curl http://localhost:8787/api/monitor/status | jq

# 方法2: 浏览器直接访问
open http://localhost:8787/api/monitor/status
```

### 预期响应结构
```json
{
  "overallStatus": "operational",
  "services": [
    {
      "id": 1,
      "name": "示例服务",
      "uptimePercentage": 99.5,
      "currentStatus": "up",
      "timeline": [
        {
          "timestamp": 1737446400,
          "status": "up",
          "responseTime": 120
        }
      ]
    }
  ],
  "lastUpdated": 1737446400
}
```

### 如果返回空数组 `{ services: [] }`
说明数据库中没有启用监控的链接，这是正常的（需要在管理后台启用监控）。

---

## 4️⃣ 测试前端页面

### 访问监控页面
```bash
# 浏览器打开
open http://localhost:5173/monitor
```

### 验证页面元素

#### ✅ 页面头部
- [ ] 页面标题："系统监控状态"
- [ ] 副标题："实时监控所有服务的可用性状态"

#### ✅ 整体状态横幅（OverallStatusBanner）
- [ ] 显示整体状态图标（✓ 绿色圆圈 / ⚠️ 黄色三角 / ❌ 红色圆圈）
- [ ] 显示状态文本："所有系统正常运行" / "部分系统出现异常" / "大部分系统离线"
- [ ] 显示最后更新时间："X 秒前" / "X 分钟前"

#### ✅ 服务卡片（如果有监控服务）
- [ ] 服务名称显示正确（不显示 URL）
- [ ] 在线率徽章显示（99.5% 格式，带颜色）
- [ ] 当前状态指示器（绿点=在线 / 红点=离线 / 黄点=慢速）
- [ ] 时间轴组件显示（45 个竖条，桌面端）

#### ✅ 空状态提示（如果没有监控服务）
- [ ] 显示空状态图标
- [ ] 显示提示文字："暂无监控服务"
- [ ] 显示引导文字："请在管理后台启用网站监控功能"

#### ✅ 页面底部
- [ ] 显示说明："监控数据每 30 秒自动刷新"

---

## 5️⃣ 测试响应式设计

### 桌面端（>= 768px）
- [ ] 服务卡片为 2 列网格布局
- [ ] 时间轴显示 45 个竖条

### 移动端（< 768px）
```bash
# 在浏览器中：
# 1. 打开开发者工具（F12）
# 2. 切换到移动设备模拟模式（iPhone 14 Pro）
# 3. 刷新页面
```

- [ ] 服务卡片为 1 列布局
- [ ] 时间轴显示 30 个竖条（而不是 45 个）
- [ ] 文字大小适配

---

## 6️⃣ 测试自动刷新功能

### 验证 React Query 自动刷新
```bash
# 1. 打开浏览器开发者工具（F12）
# 2. 切换到 Network 标签
# 3. 访问 http://localhost:5173/monitor
# 4. 观察网络请求

# 预期行为：
# - 初始加载：发送 1 次 GET /api/monitor/status 请求
# - 30 秒后：自动发送第 2 次请求
# - 再 30 秒后：自动发送第 3 次请求
```

### 验证加载状态（Skeleton）
```bash
# 1. 打开浏览器开发者工具（F12）
# 2. 切换到 Network 标签
# 3. 设置网络节流（Network throttling: Slow 3G）
# 4. 刷新页面

# 预期行为：
# - 显示 3 个灰色矩形 Skeleton（模拟加载）
# - 数据加载完成后，Skeleton 消失，显示真实内容
```

---

## 7️⃣ 测试错误处理

### 模拟后端不可用
```bash
# 1. 停止后端服务器（Ctrl+C 终止 Terminal 1）
# 2. 刷新前端页面

# 预期行为：
# - 显示红色错误提示框
# - 错误消息："获取监控状态失败"
# - 显示"重试"按钮
# - 点击"重试"按钮会重新发送请求
```

---

## 8️⃣ 测试时间轴 Hover 效果

### 鼠标悬停测试
```bash
# 1. 访问监控页面（需要有监控数据）
# 2. 将鼠标悬停在时间轴的任意竖条上

# 预期行为：
# - 竖条放大 110%（scale-110）
# - 显示阴影效果
# - 显示 tooltip（时间 - 状态 - 响应时间）
#   例如："2026-01-21 15:30:00 - 在线 - 120ms"
```

---

## 9️⃣ 常见问题排查

### ❌ 后端启动失败
**症状**: `wrangler dev` 报错
**解决**:
```bash
# 检查 D1 数据库绑定
cat wrangler.toml | grep -A 5 "d1_databases"

# 应该包含：
# [[d1_databases]]
# binding = "DB"
# database_name = "cf-nav-db"
# database_id = "your-database-id"
```

### ❌ 前端显示 CORS 错误
**症状**: 浏览器控制台报错 "CORS policy"
**解决**:
```bash
# 检查 backend/.env 中的 ALLOWED_ORIGINS
cat backend/.env | grep ALLOWED_ORIGINS

# 应该包含：
# ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### ❌ API 返回空数组
**症状**: `{ services: [] }`
**原因**: 数据库中没有启用监控的链接
**解决**: 这是正常的，需要在管理后台启用监控功能

### ❌ 时间轴显示空白
**症状**: 服务卡片显示，但时间轴是空的
**原因**: `timeline` 数组为空（没有检测记录）
**解决**: 需要后台定时任务执行检测后才会有数据

---

## 🎯 测试完成标准

- [x] 后端服务器成功启动
- [x] 前端服务器成功启动
- [x] API 返回正确的 JSON 结构（即使 services 为空）
- [x] 监控页面正确渲染
- [x] 整体状态横幅显示正确
- [x] 空状态提示显示正确（如果没有监控服务）
- [x] 移动端布局正确适配
- [x] 自动刷新功能正常工作（30 秒间隔）
- [x] 错误处理正确显示

---

## 📝 测试记录

### 测试时间
- 开始时间: ___________
- 结束时间: ___________

### 测试结果
- [ ] ✅ 所有测试通过
- [ ] ⚠️ 部分测试通过（记录问题）
- [ ] ❌ 测试失败（记录错误）

### 发现的问题
1. ___________
2. ___________
3. ___________

---

*测试指南生成时间: 2026-01-21*
*功能版本: v1.0.0*
