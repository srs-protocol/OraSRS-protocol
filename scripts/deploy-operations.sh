#!/bin/bash

# OraSRS 混合L2架构一键部署和操作脚本

set -e

echo "=================================================="
echo "    OraSRS 混合L2架构部署和操作脚本"
echo "=================================================="

show_help() {
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  deploy     - 部署完整的混合L2架构"
    echo "  start      - 启动双链环境"
    echo "  stop       - 停止双链环境" 
    echo "  test       - 运行完整测试套件"
    echo "  validate   - 验证跨链通信"
    echo "  demo       - 运行端到端演示"
    echo "  logs       - 查看服务日志"
    echo "  clean      - 清理部署"
    echo "  help       - 显示此帮助信息"
    echo ""
}

case "$1" in
    "deploy")
        echo "部署完整的混合L2架构..."
        echo "1. 启动双链环境"
        docker-compose -f docker-compose.testnet.yml up -d
        
        echo "2. 等待服务启动..."
        sleep 10
        
        echo "3. 部署双链合约"
        node scripts/dual-chain-deployment.js
        
        echo "4. 配置LayerZero跨链连接"
        node scripts/configure-layerzero.js
        
        echo "5. 验证消息流通路"
        node scripts/validate-message-flow.js
        
        echo "部署完成!"
        ;;
        
    "start")
        echo "启动双链环境..."
        docker-compose -f docker-compose.testnet.yml up -d
        echo "双链环境已启动"
        echo "国内链 (1001): http://localhost:8545"
        echo "海外链 (1002): http://localhost:8546"
        ;;
        
    "stop")
        echo "停止双链环境..."
        docker-compose -f docker-compose.testnet.yml down
        echo "双链环境已停止"
        ;;
        
    "test")
        echo "运行完整测试套件..."
        echo "1. 验证区块链连接"
        node test/network-test.js
        
        echo "2. 验证合约部署"
        node test/contract-deployment-test.js
        
        echo "3. 验证跨链功能"
        node test/crosschain-communication-test.js
        
        echo "测试套件完成!"
        ;;
        
    "validate")
        echo "验证跨链通信..."
        node scripts/validate-message-flow.js
        ;;
        
    "demo")
        echo "运行端到端演示..."
        node test/full-demo-summary.js
        ;;
        
    "logs")
        echo "查看服务日志..."
        docker-compose -f docker-compose.testnet.yml logs
        ;;
        
    "clean")
        echo "清理部署..."
        docker-compose -f docker-compose.testnet.yml down
        rm -rf deployed_addresses/
        echo "清理完成!"
        ;;
        
    "help"|"-h"|"--help"|"")
        show_help
        ;;
        
    *)
        echo "未知命令: $1"
        show_help
        exit 1
        ;;
esac

echo ""
echo "=================================================="
echo "OraSRS 混合L2架构操作完成"
echo "更多详情请查看: docs/HYBRID_L2_OPERATIONS_MANUAL.md"
echo "=================================================="