# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine

# 安装基础工具
RUN apk add --no-cache curl

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 创建数据库目录
RUN mkdir -p /app/data/db /app/public/db

# 创建启动脚本
RUN echo '#!/bin/sh' > /app/docker-entrypoint.sh && \
    echo 'if [ ! -f /app/data/db/.initialized ]; then' >> /app/docker-entrypoint.sh && \
    echo '  echo "首次启动，开始下载数据库..."' >> /app/docker-entrypoint.sh && \
    echo '  npm run download-db' >> /app/docker-entrypoint.sh && \
    echo '  touch /app/data/db/.initialized' >> /app/docker-entrypoint.sh && \
    echo 'fi' >> /app/docker-entrypoint.sh && \
    echo '' >> /app/docker-entrypoint.sh && \
    echo 'exec npm start' >> /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# 构建应用 - 添加空的BLOB令牌以防止构建失败
ENV BLOB_READ_WRITE_TOKEN="dummy-token-for-build"
RUN npm run build
ENV BLOB_READ_WRITE_TOKEN=""

# 创建数据库目录的 volume
VOLUME ["/app/data/db", "/app/public/db"]

# 暴露端口
EXPOSE 3000

# 启动应用
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1 
