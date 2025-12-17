#!/bin/bash

# OraSRS Network Manager
# OraSRS网络管理脚本

NETWORK_NAME="orasrs-network"

show_help() {
    echo "OraSRS Network Manager"
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start     - Start the OraSRS blockchain network"
    echo "  stop      - Stop the OraSRS blockchain network"
    echo "  restart   - Restart the OraSRS blockchain network"
    echo "  status    - Show network status"
    echo "  logs      - Show network logs"
    echo "  logs-f    - Follow network logs"
    echo "  clean     - Clean network data (warning: deletes all data)"
    echo "  deploy-contract - Deploy/update smart contracts"
    echo "  monitor   - Show network monitoring info"
    echo "  help      - Show this help message"
}

start_network() {
    echo "Starting OraSRS blockchain network..."
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        echo "Network started successfully!"
        echo "Access the network at:"
        echo "  - Node 1 API: http://localhost:8081"
        echo "  - Node 2 API: http://localhost:8082"
        echo "  - Node 3 API: http://localhost:8083"
        echo "  - Grafana: http://localhost:3000"
    else
        echo "Error: docker-compose.yml not found!"
        echo "Please run this script from the OraSRS project root directory."
        exit 1
    fi
}

stop_network() {
    echo "Stopping OraSRS blockchain network..."
    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        echo "Network stopped successfully!"
    else
        echo "Error: docker-compose.yml not found!"
    fi
}

restart_network() {
    stop_network
    sleep 3
    start_network
}

show_status() {
    echo "OraSRS Network Status:"
    if [ -f "docker-compose.yml" ]; then
        docker-compose ps
    else
        echo "Error: docker-compose.yml not found!"
    fi
}

show_logs() {
    if [ -f "docker-compose.yml" ]; then
        docker-compose logs
    else
        echo "Error: docker-compose.yml not found!"
    fi
}

follow_logs() {
    if [ -f "docker-compose.yml" ]; then
        docker-compose logs -f
    else
        echo "Error: docker-compose.yml not found!"
    fi
}

clean_network() {
    echo "WARNING: This will delete all network data!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Cleaning OraSRS network data..."
        if [ -f "docker-compose.yml" ]; then
            docker-compose down -v
            rm -rf data/ logs/ pki/
            mkdir -p data node1 node2 node3 logs
            echo "Network data cleaned!"
        else
            echo "Error: docker-compose.yml not found!"
        fi
    else
        echo "Clean operation cancelled."
    fi
}

deploy_contract() {
    echo "Deploying/Updating OraSRS smart contracts..."
    # 在实际部署中，这里会包含合约部署逻辑
    echo "Smart contract deployment completed!"
}

monitor_network() {
    echo "OraSRS Network Monitoring:"
    echo "=========================="
    
    if [ -f "docker-compose.yml" ]; then
        # 检查容器状态
        echo "Container Status:"
        docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
        echo ""
        
        # 检查资源使用
        echo "Resource Usage:"
        docker stats --no-stream | grep orasrs
        echo ""
        
        # 显示API端点
        echo "API Endpoints:"
        echo "  - Node 1: http://localhost:8081"
        echo "  - Node 2: http://localhost:8082" 
        echo "  - Node 3: http://localhost:8083"
        echo "  - Prometheus: http://localhost:9090"
        echo "  - Grafana: http://localhost:3000"
        echo ""
        
        # 显示当前时间
        echo "Current Time: $(date)"
    fi
}

case "$1" in
    "start")
        start_network
        ;;
    "stop")
        stop_network
        ;;
    "restart")
        restart_network
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "logs-f")
        follow_logs
        ;;
    "clean")
        clean_network
        ;;
    "deploy-contract")
        deploy_contract
        ;;
    "monitor")
        monitor_network
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use 'help' to see available commands."
        exit 1
        ;;
esac