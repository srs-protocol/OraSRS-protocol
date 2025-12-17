#!/bin/bash

# 停止OraSRS私有链节点和API网关
echo "停止OraSRS私有链节点和相关服务..."

# 停止Docker容器（如果存在）
if command -v docker &> /dev/null && docker ps | grep -q orasrs; then
    echo "停止Docker容器..."
    docker-compose -f docker-compose-permissioned.yml down || echo "Docker Compose未运行或已停止"
fi

# 查找并停止geth进程
pkill -f "geth.*--datadir.*orasrs-chain" || echo "未找到OraSRS相关的geth进程"

# 也可以通过端口查找
if command -v lsof &> /dev/null; then
    if lsof -Pi :8545 -sTCP:LISTEN > /dev/null; then
        echo "发现8545端口被占用，正在停止相关进程..."
        lsof -ti:8545 | xargs kill -9 2>/dev/null || echo "没有进程在使用8545端口"
    fi
    
    if lsof -Pi :8081 -sTCP:LISTEN > /dev/null; then
        echo "发现8081端口被占用，正在停止相关进程..."
        lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "没有进程在使用8081端口"
    fi
fi

echo "OraSRS私有链节点和相关服务已停止"