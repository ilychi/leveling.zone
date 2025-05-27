#!/bin/bash

echo "🧪 Caddy 配置测试脚本"
echo "================================"

# 检查是否安装了curl
if ! command -v curl &> /dev/null; then
    echo "❌ 请先安装 curl"
    exit 1
fi

# 检查Caddy配置文件
echo "🔍 检查配置文件..."
if [ -f "Caddyfile" ]; then
    echo "✅ 找到生产环境配置: Caddyfile"
else
    echo "❌ 未找到 Caddyfile"
fi

if [ -f "Caddyfile.local" ]; then
    echo "✅ 找到本地测试配置: Caddyfile.local"
else
    echo "❌ 未找到 Caddyfile.local"
fi

if [ -f "docker-compose.caddy.yml" ]; then
    echo "✅ 找到Docker Compose配置: docker-compose.caddy.yml"
else
    echo "❌ 未找到 docker-compose.caddy.yml"
fi

echo ""

# 检查Next.js应用是否运行
echo "🔍 检查Next.js应用状态..."
if curl -s -f "http://localhost:3000/api/health" > /dev/null; then
    echo "✅ Next.js应用运行正常 (http://localhost:3000)"
else
    echo "❌ Next.js应用未运行，请先启动应用:"
    echo "   npm run dev"
    echo "   或: docker-compose up -d"
    exit 1
fi

echo ""

# 测试原始路径
echo "🧪 测试原始应用路径..."
echo "测试 /myip:"
MYIP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/myip")
if [ "$MYIP_STATUS" = "200" ]; then
    echo "✅ /myip 页面正常 (状态码: $MYIP_STATUS)"
else
    echo "❌ /myip 页面异常 (状态码: $MYIP_STATUS)"
fi

echo "测试 /ip/query:"
QUERY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/ip/query")
if [ "$QUERY_STATUS" = "200" ]; then
    echo "✅ /ip/query 页面正常 (状态码: $QUERY_STATUS)"
else
    echo "❌ /ip/query 页面异常 (状态码: $QUERY_STATUS)"
fi

echo ""

# 检查Caddy是否运行
echo "🔍 检查Caddy代理状态..."
if curl -s -f "http://localhost/ip" > /dev/null 2>&1; then
    echo "✅ Caddy代理运行正常"
    
    echo ""
    echo "🧪 测试路径映射..."
    
    # 测试 /ip -> /myip 映射
    echo "测试 localhost/ip -> /myip:"
    IP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/ip")
    if [ "$IP_STATUS" = "200" ]; then
        echo "✅ localhost/ip 映射正常 (状态码: $IP_STATUS)"
    else
        echo "❌ localhost/ip 映射异常 (状态码: $IP_STATUS)"
    fi
    
    # 测试 /ip/query -> /ip/query 映射
    echo "测试 localhost/ip/query -> /ip/query:"
    QUERY_PROXY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/ip/query")
    if [ "$QUERY_PROXY_STATUS" = "200" ]; then
        echo "✅ localhost/ip/query 映射正常 (状态码: $QUERY_PROXY_STATUS)"
    else
        echo "❌ localhost/ip/query 映射异常 (状态码: $QUERY_PROXY_STATUS)"
    fi
    
    # 测试API代理
    echo "测试 localhost/api/myip:"
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/api/myip")
    if [ "$API_STATUS" = "200" ]; then
        echo "✅ localhost/api/myip 代理正常 (状态码: $API_STATUS)"
    else
        echo "❌ localhost/api/myip 代理异常 (状态码: $API_STATUS)"
    fi
    
else
    echo "❌ Caddy代理未运行，请启动Caddy:"
    echo "   本地测试: caddy run --config Caddyfile.local"
    echo "   生产环境: sudo caddy run --config Caddyfile"
    echo "   Docker: docker-compose -f docker-compose.caddy.yml up -d"
fi

echo ""
echo "📋 总结："
echo "1. 确保Next.js应用运行在 http://localhost:3000"
echo "2. 启动Caddy代理服务"
echo "3. 访问 http://localhost/ip 查看myip页面"
echo "4. 访问 http://localhost/ip/query 查看查询页面"
echo ""
echo "🔗 生产环境访问地址:"
echo "   https://rere.ws/ip"
echo "   https://rere.ws/ip/query" 
