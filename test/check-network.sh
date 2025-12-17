#!/bin/bash
echo "检查OraSRS网络状态..."

# 检查端口是否被占用
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "节点API (8080): 运行中"
else
    echo "节点API (8080): 未运行"
fi

if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "节点1 API (8081): 运行中"
else
    echo "节点1 API (8081): 未运行"
fi

if lsof -Pi :8082 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "节点2 API (8082): 运行中"
else
    echo "节点2 API (8082): 未运行"
fi

if lsof -Pi :8083 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "节点3 API (8083): 运行中"
else
    echo "节点3 API (8083): 未运行"
fi

echo "检查Docker容器..."
docker ps | grep orasrs || echo "没有运行中的orasrs容器"
