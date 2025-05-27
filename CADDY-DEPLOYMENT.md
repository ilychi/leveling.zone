# Caddy 2 反向代理部署指南

本指南帮你使用 Caddy 2 为 LEVELING.ZONE 项目配置反向代理，实现以下域名映射：

- `rere.ws/ip` → 项目的 `/myip` 页面
- `rere.ws/ip/query` → 项目的 `/ip/query` 页面

## 🚀 快速部署

### 方法 1: Docker Compose (推荐)

```bash
# 1. 确保域名解析正确
# 将 rere.ws 的 A 记录指向你的服务器IP

# 2. 创建必要的目录
mkdir -p logs data/db

# 3. 设置环境变量（可选）
export GITHUB_TOKEN=your_github_token_here

# 4. 启动服务
docker-compose -f docker-compose.caddy.yml up -d

# 5. 检查服务状态
docker-compose -f docker-compose.caddy.yml ps
```

### 方法 2: 本地 Caddy + Docker 应用

```bash
# 1. 启动Next.js应用
docker-compose up -d

# 2. 安装Caddy (macOS)
brew install caddy

# 3. 启动Caddy (生产环境)
sudo caddy run --config Caddyfile

# 或本地测试
caddy run --config Caddyfile.local
```

## 📋 路径映射说明

| 访问 URL           | 代理到      | 说明               |
| ------------------ | ----------- | ------------------ |
| `rere.ws/ip`       | `/myip`     | 显示访问者 IP 信息 |
| `rere.ws/ip/query` | `/ip/query` | IP 查询工具页面    |
| `rere.ws/api/*`    | `/api/*`    | API 接口直接代理   |

## 🔧 配置文件说明

### 1. Caddyfile (生产环境)

- 自动 HTTPS 证书申请和续期
- 使用 Docker 服务名 `app:3000`
- 完整的安全头配置
- Gzip 压缩和缓存优化

### 2. Caddyfile.local (本地测试)

- 使用 `localhost`，无需 HTTPS
- 直接连接 `localhost:3000`
- 基础配置，便于调试

### 3. docker-compose.caddy.yml

- Caddy + Next.js 应用完整栈
- 自动健康检查和依赖管理
- 数据持久化配置

## 🛠️ 本地测试

### 1. 启动 Next.js 应用

```bash
npm run dev
# 或
docker-compose up -d
```

### 2. 启动 Caddy (本地测试)

```bash
caddy run --config Caddyfile.local
```

### 3. 测试路径映射

```bash
# 测试/myip页面
curl http://localhost/ip

# 测试/ip/query页面
curl http://localhost/ip/query

# 测试API
curl http://localhost/api/myip
```

## 🚀 生产部署

### 1. 准备域名和服务器

```bash
# 确保域名DNS记录正确
dig rere.ws

# 确保防火墙开放端口
ufw allow 80
ufw allow 443
```

### 2. 部署到服务器

```bash
# 克隆项目
git clone https://github.com/lucking7/leveling.zone.git
cd leveling.zone

# 创建必要目录
mkdir -p logs data/db

# 启动完整栈
docker-compose -f docker-compose.caddy.yml up -d
```

### 3. 验证部署

```bash
# 检查容器状态
docker ps

# 检查Caddy日志
docker logs leveling-zone-caddy

# 检查应用日志
docker logs leveling-zone-app

# 测试HTTPS
curl https://rere.ws/ip
curl https://rere.ws/ip/query
```

## 📊 监控和维护

### 查看日志

```bash
# Caddy访问日志
tail -f logs/rere.ws.log

# 实时日志
docker-compose -f docker-compose.caddy.yml logs -f

# 特定服务日志
docker logs -f leveling-zone-caddy
docker logs -f leveling-zone-app
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建和部署
docker-compose -f docker-compose.caddy.yml up -d --build

# 重载Caddy配置（无需重启）
docker exec leveling-zone-caddy caddy reload --config /etc/caddy/Caddyfile
```

### 备份和恢复

```bash
# 备份数据库文件
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 备份Caddy数据（证书等）
docker run --rm -v leveling-zone_caddy_data:/data -v $(pwd):/backup alpine tar czf /backup/caddy-backup.tar.gz -C /data .
```

## 🐛 故障排除

### 常见问题

1. **域名无法访问**

   ```bash
   # 检查DNS解析
   nslookup rere.ws

   # 检查Caddy状态
   docker exec leveling-zone-caddy caddy version
   ```

2. **HTTPS 证书问题**

   ```bash
   # 查看证书获取日志
   docker logs leveling-zone-caddy | grep -i cert

   # 手动重新获取证书
   docker exec leveling-zone-caddy caddy reload --config /etc/caddy/Caddyfile
   ```

3. **应用无法访问**

   ```bash
   # 检查应用健康状态
   curl http://localhost:3000/api/health

   # 检查网络连接
   docker exec leveling-zone-caddy nslookup app
   ```

4. **路径映射错误**

   ```bash
   # 测试Caddy配置
   docker exec leveling-zone-caddy caddy validate --config /etc/caddy/Caddyfile

   # 查看详细日志
   docker logs leveling-zone-caddy --tail 100
   ```

## 🔒 安全配置

### SSL/TLS 优化

默认配置已包含：

- 自动 HTTPS 重定向
- 现代 TLS 配置
- HSTS 头部
- 安全头部设置

### 额外安全措施

```bash
# 限制访问IP（可选）
# 在Caddyfile中添加：
# @allowed {
#     remote_ip 1.2.3.4 5.6.7.8
# }
# handle @allowed {
#     # 现有配置
# }
```

## 📈 性能优化

已包含的优化：

- ✅ Gzip 压缩
- ✅ 静态资源缓存
- ✅ API 无缓存策略
- ✅ 连接复用
- ✅ HTTP/2 支持

### 进一步优化

```bash
# 启用Brotli压缩（需要插件）
# encode {
#     brotli 6
#     gzip 6
# }

# 添加CDN配置
# header {
#     X-CDN-Cache-Status {http.resp.headers.cf-cache-status}
# }
```
