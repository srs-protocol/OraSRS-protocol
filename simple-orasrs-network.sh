#!/bin/bash

# Simple OraSRS Blockchain Network for Testing
# 简化版OraSRS区块链网络，用于测试

set -e

echo "=================================================="
echo "    Simple OraSRS Protocol Test Network"
echo "           测试网络启动脚本"
echo "=================================================="

# 创建目录结构
echo "创建目录结构..."
mkdir -p data node1 node2 node3 logs contracts

# 检查Go环境
if ! command -v go &> /dev/null; then
    echo "错误: Go 未安装或不可用"
    exit 1
fi

# 检查Docker环境
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装或不可用"
    exit 1
fi

# 创建一个基础的智能合约编译脚本
cat > compile-contracts.sh << 'EOF'
#!/bin/bash
echo "编译OraSRS智能合约..."

# 创建一个简单的合约编译脚本
if [ -f "../chainmaker-contract/main/orasrs" ]; then
    echo "复制预编译的ChainMaker合约..."
    cp ../chainmaker-contract/main/orasrs contracts/
elif [ -f "../chainmaker-contract/main/main" ]; then
    echo "复制预编译的ChainMaker合约..."
    cp ../chainmaker-contract/main/main contracts/orasrs
else
    echo "警告: 未找到预编译合约，创建模拟合约..."
    echo '#!/bin/bash' > contracts/orasrs
    echo 'echo "Mock OraSRS Contract"' >> contracts/orasrs
    chmod +x contracts/orasrs
fi
EOF

chmod +x compile-contracts.sh
./compile-contracts.sh

# 创建一个简单的网络监控脚本
cat > check-network.sh << 'EOF'
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
EOF

chmod +x check-network.sh

echo ""
echo "=================================================="
echo "Simple OraSRS Test Network 环境已准备就绪!"
echo "=================================================="
echo ""
echo "接下来的步骤:"
echo "1. 编译ChainMaker智能合约（如果尚未编译）"
echo "2. 启动ChainMaker网络"
echo "3. 注册治理地址"
echo "4. 部署合约"
echo ""
echo "要检查网络状态: ./check-network.sh"
echo ""
echo "当前目录结构:"
ls -la
echo ""
echo "=================================================="