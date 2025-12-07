#!/bin/bash

# OraSRS 客户端打包脚本

echo "🚀 开始打包 OraSRS 客户端..."

# 创建 dist 目录
mkdir -p dist

echo "📦 打包 Linux 版本..."
npx pkg orasrs-simple-client.js --targets node18-linux-x64 --output dist/orasrs-simple-client-linux

echo "🍎 打包 macOS 版本..."
npx pkg orasrs-simple-client.js --targets node18-macos-x64 --output dist/orasrs-simple-client-macos

echo "🪟 打包 Windows 版本..."
npx pkg orasrs-simple-client.js --targets node18-win-x64 --output dist/orasrs-simple-client-win.exe

echo "✅ 所有平台打包完成!"
echo "📁 生成的文件:"
ls -la dist/

echo ""
echo "📋 使用说明:"
echo "1. 给 Linux/macOS 文件添加执行权限: chmod +x filename"
echo "2. 直接运行二进制文件启动 OraSRS 客户端"
echo "3. 客户端将自动连接到 OraSRS 协议链 (api.orasrs.net)"

echo ""
echo "🔗 服务启动后将运行在 http://localhost:3006"
echo "📊 API 端点: http://localhost:3006/orasrs/v1/query?ip=1.2.3.4"