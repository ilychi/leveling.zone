# Docker 部署指南

本项目支持完整的 Docker 部署，包括自动从 GitHub Release 下载 IP 数据库文件。

## 🚀 快速开始

### 1. 基础 Docker 部署

```bash
# 构建镜像
docker build -t leveling-zone .

# 运行容器
docker run -d \
  --name leveling-zone \
  -p 3000:3000 \
  -v $(pwd)/data/db:/app/data/db \
  leveling-zone
```

### 2. 使用 Docker Compose（推荐）

```bash
# 开发环境（包含数据库下载器）
docker-compose -f docker-compose.dev.yml up -d

# 生产环境
docker-compose up -d
```

## 📋 功能特性

### ✅ 自动数据库下载

- 首次启动时自动从 [GitHub Release](https://github.com/lucking7/leveling.zone/releases) 下载最新数据库
- 支持断点续传和重试机制
- 创建 `.initialized` 标记文件避免重复下载

### ✅ 支持的数据库文件

- **MaxMind GeoLite2**: Country, City, ASN
- **DB-IP**: Country, City, ASN
- **IP2Location**: DB11, ASN, Proxy
- **IPinfo**: Country ASN
- **其他**: QQWry, GeoCN, IP-to-ASN 映射

### ✅ 智能缓存机制

- 检查本地文件大小，避免重复下载
- 支持增量更新
- 数据持久化存储

## 🔧 环境变量

```bash
# 可选：GitHub Token（避免 API 限制）
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# 可选：Node.js 环境
NODE_ENV=production
```

## 📁 目录结构

```
/app/
├── data/db/          # 主数据库目录（持久化）
├── public/db/        # 备用数据库目录
└── .initialized      # 初始化标记文件
```

## 🐛 故障排除

### 数据库下载失败

```bash
# 手动触发下载
docker exec leveling-zone npm run download-db-local

# 检查日志
docker logs leveling-zone
```

### 网络问题

- 设置 `GITHUB_TOKEN` 环境变量避免 API 限制
- 确保容器能访问 GitHub API

### 权限问题

```bash
# 确保数据目录权限正确
chmod -R 755 ./data/db
```

## 📊 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/api/health

# 检查数据库状态
curl http://localhost:3000/api/db/info
```

## 🔄 更新数据库

```bash
# 删除初始化标记，重启容器将重新下载
docker exec leveling-zone rm /app/data/db/.initialized
docker restart leveling-zone
```

## 📈 性能优化

- 使用 SSD 存储数据库文件
- 配置足够的内存（推荐 2GB+）
- 使用 Nginx 反向代理和缓存
- 启用 gzip 压缩

## 🔗 相关链接

- [GitHub Repository](https://github.com/lucking7/leveling.zone)
- [Latest Release](https://github.com/lucking7/leveling.zone/releases/latest)
- [Docker Hub](https://hub.docker.com) (如果发布的话)
