# 数据库 IP 查询服务

这是一个 IP 地址信息查询服务，支持多种数据库和 API 服务。

## 注意：数据库文件

为了减小 Git 仓库大小，所有数据库文件(.mmdb, .BIN, .ipdb 等)已被从 Git 仓库中排除。

### 数据库文件目录结构

以下目录需要手动添加数据库文件：

- `data/db/` - 主数据库目录
- `db/` - 备用数据库目录
- `public/db/` - 公开数据库目录

### 数据库文件获取方式

您可以从以下来源获取 IP 数据库文件：

1. **MaxMind GeoLite2**：

   - 创建免费账户：https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
   - 下载 GeoLite2-Country.mmdb, GeoLite2-City.mmdb, GeoLite2-ASN.mmdb

2. **IP2Location LITE**：
   - 注册免费账户：https://lite.ip2location.com
   - 下载 IP2LOCATION-LITE-DB11.BIN, IP2LOCATION-LITE-PX11.BIN, IP2LOCATION-LITE-ASN.BIN

下载后，将文件放入相应目录。

## 安装与运行

```bash
# 安装依赖
npm install

# 运行开发环境
npm run dev

# 构建生产版本
npm run build
npm start
```

## Docker 支持

```bash
# 构建并运行Docker容器
docker-compose up -d
```
