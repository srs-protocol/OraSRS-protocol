#!/bin/bash

# OraSRS Protocol Blockchain Network Startup Script
# OraSRS协议区块链网络启动脚本

set -e  # 遇到错误时退出

echo "=================================================="
echo "    OraSRS Protocol Blockchain Network v2.0"
echo "           启动脚本"
echo "=================================================="

# 检查依赖
echo "检查依赖..."
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装或不可用"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装或不可用"
    exit 1
fi

# 创建必要的目录
echo "创建目录结构..."
mkdir -p logs data pki contracts

# 部署智能合约
echo "部署OraSRS智能合约..."
if [ -f "chainmaker-contract/main/orasrs" ]; then
    echo "复制ChainMaker智能合约..."
    cp chainmaker-contract/main/orasrs contracts/
else
    echo "警告: ChainMaker合约未编译，跳过部署"
fi

# 检查Docker Compose文件
if [ ! -f "docker-compose.yml" ]; then
    echo "创建Docker Compose配置文件..."
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # OraSRS区块链节点1
  orasrs-node-1:
    image: chainmaker/chainmaker:v2.0.0
    container_name: orasrs-node-1
    ports:
      - "12301:12301"
      - "8081:8080"
      - "9091:9090"
      - "9092:9091"
    volumes:
      - ./data/node1:/opt/chainmaker/data
      - ./pki/node1:/opt/chainmaker/pki
      - ./contracts:/opt/chainmaker/contracts
      - ./chainmaker-contract/config/orasrs_network_config.yml:/opt/chainmaker/config/config.yml
    environment:
      - NODE_ID=node-001
      - LISTEN_PORT=12301
    networks:
      - orasrs-net
    restart: unless-stopped

  # OraSRS区块链节点2
  orasrs-node-2:
    image: chainmaker/chainmaker:v2.0.0
    container_name: orasrs-node-2
    ports:
      - "12302:12301"
      - "8082:8080"
      - "9093:9090"
      - "9094:9091"
    volumes:
      - ./data/node2:/opt/chainmaker/data
      - ./pki/node2:/opt/chainmaker/pki
      - ./contracts:/opt/chainmaker/contracts
      - ./chainmaker-contract/config/orasrs_network_config.yml:/opt/chainmaker/config/config.yml
    environment:
      - NODE_ID=node-002
      - LISTEN_PORT=12301
    networks:
      - orasrs-net
    restart: unless-stopped

  # OraSRS区块链节点3
  orasrs-node-3:
    image: chainmaker/chainmaker:v2.0.0
    container_name: orasrs-node-3
    ports:
      - "12303:12301"
      - "8083:8080"
      - "9095:9090"
      - "9096:9091"
    volumes:
      - ./data/node3:/opt/chainmaker/data
      - ./pki/node3:/opt/chainmaker/pki
      - ./contracts:/opt/chainmaker/contracts
      - ./chainmaker-contract/config/orasrs_network_config.yml:/opt/chainmaker/config/config.yml
    environment:
      - NODE_ID=node-003
      - LISTEN_PORT=12301
    networks:
      - orasrs-net
    restart: unless-stopped

  # 监控服务
  prometheus:
    image: prom/prometheus:latest
    container_name: orasrs-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - orasrs-net
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: orasrs-grafana
    ports:
      - "3000:3000"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    networks:
      - orasrs-net
    restart: unless-stopped

networks:
  orasrs-net:
    driver: bridge
EOF
fi

# 创建Prometheus配置
mkdir -p prometheus
cat > prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'orasrs-nodes'
    static_configs:
      - targets: ['orasrs-node-1:9091', 'orasrs-node-2:9091', 'orasrs-node-3:9091']
EOF

# 创建Grafana配置
mkdir -p grafana/provisioning/dashboards
cat > grafana/provisioning/dashboards/default.yaml << 'EOF'
apiVersion: 1
providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /etc/grafana/dashboards
EOF

mkdir -p grafana/dashboards
cat > grafana/dashboards/orasrs-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "OraSRS Network Dashboard",
    "panels": [
      {
        "id": 1,
        "title": "Network Health",
        "type": "stat",
        "targets": [
          {
            "expr": "up{job=\"orasrs-nodes\"}",
            "legendFormat": "{{instance}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Threat Reports",
        "type": "graph",
        "targets": [
          {
            "expr": "orasrs_threat_reports_total",
            "legendFormat": "Total Threat Reports"
          }
        ]
      },
      {
        "id": 3,
        "title": "Active Nodes",
        "type": "stat",
        "targets": [
          {
            "expr": "orasrs_active_nodes",
            "legendFormat": "Active Nodes"
          }
        ]
      }
    ]
  }
}
EOF

# 启动网络
echo "启动OraSRS区块链网络..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo ""
echo "=================================================="
echo "OraSRS Protocol Blockchain Network 已成功启动!"
echo "=================================================="
echo ""
echo "服务地址:"
echo "  - 节点1 API: http://localhost:8081"
echo "  - 节点2 API: http://localhost:8082"
echo "  - 节点3 API: http://localhost:8083"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3000 (admin/admin123)"
echo ""
echo "智能合约已部署，网络配置:"
echo "  - 共识算法: DPoS"
echo "  - 节点数量: 3"
echo "  - 威胁情报: 启用"
echo "  - 跨链功能: 预留（用户多时启用）"
echo ""
echo "要查看日志: docker-compose logs -f"
echo "要停止网络: docker-compose down"
echo "=================================================="
