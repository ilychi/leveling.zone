#!/bin/bash

echo "🧪 测试Docker启动脚本逻辑"
echo "================================"

# 模拟Docker启动脚本的逻辑
if [ ! -f ./data/db/.initialized ]; then
  echo "✅ 检测到首次启动，会执行数据库下载..."
  echo "📥 将运行: npm run download-db-local"
  echo "📝 将创建: ./data/db/.initialized 标记文件"
else
  echo "✅ 检测到已初始化，跳过数据库下载"
fi

echo ""
echo "🔍 检查package.json中的脚本:"
if grep -q "download-db-local" package.json; then
  echo "✅ download-db-local 脚本存在"
else
  echo "❌ download-db-local 脚本不存在"
fi

echo ""
echo "📋 Docker相关的npm脚本:"
grep -E "(download-db|build|start)" package.json | sed 's/^/  /'

echo ""
echo "🐳 Dockerfile修复验证:"
if grep -q "download-db-local" Dockerfile; then
  echo "✅ Dockerfile使用正确的下载脚本"
else
  echo "❌ Dockerfile仍使用错误的脚本"
fi 
