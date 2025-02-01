# 使用 Node.js 20 作为基础镜像
FROM node:20-alpine

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

# 构建应用
RUN npm run build

# 创建数据库目录的 volume
VOLUME ["/app/data/db", "/app/public/db"]

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1 
