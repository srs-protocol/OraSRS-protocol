#!/bin/bash

# OraSRS (Oracle Security Root Service) 一键安装脚本
# 适用于 Linux 系统

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_info "当前为root用户，继续安装"
    else
        print_error "请使用root权限运行此脚本"
        exit 1
    fi
}

# 检查系统类型
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        print_error "无法检测操作系统"
        exit 1
    fi
    
    print_info "检测到操作系统: $OS"
}

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."
    
    # 检查git
    if ! command -v git &> /dev/null; then
        print_info "安装git..."
        if [[ "$OS" == *"Ubuntu"* || "$OS" == *"Debian"* ]]; then
            apt update && apt install -y git
        elif [[ "$OS" == *"CentOS"* || "$OS" == *"Red Hat"* || "$OS" == *"Rocky"* || "$OS" == *"AlmaLinux"* ]]; then
            yum install -y git
        elif [[ "$OS" == *"Fedora"* ]]; then
            dnf install -y git
        else
            print_error "不支持的操作系统: $OS"
            exit 1
        fi
    fi
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_info "安装Node.js..."
        # 安装Node.js 18.x
        if [[ "$OS" == *"Ubuntu"* || "$OS" == *"Debian"* ]]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt install -y nodejs
        elif [[ "$OS" == *"CentOS"* || "$OS" == *"Red Hat"* || "$OS" == *"Rocky"* || "$OS" == *"AlmaLinux"* ]]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        elif [[ "$OS" == *"Fedora"* ]]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            dnf install -y nodejs
        fi
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm未安装"
        exit 1
    fi
    
    print_success "依赖检查完成"
}

# 克隆OraSRS项目
clone_orasrs() {
    print_info "克隆OraSRS项目..."
    
    if [[ -d "/opt/orasrs" ]]; then
        print_warning "/opt/orasrs 已存在，正在更新..."
        cd /opt/orasrs
        git pull
    else
        git clone https://github.com/srs-protocol/OraSRS-protocol.git /opt/orasrs
        cd /opt/orasrs
        git checkout lite-client
    fi
    
    print_success "项目克隆完成"
}

# 安装Node.js依赖
install_node_dependencies() {
    print_info "安装Node.js依赖..."
    
    cd /opt/orasrs
    
    # 安装项目依赖
    npm install
    
    # 确保所有必要的文件都存在
    if [[ ! -f "/opt/orasrs/blockchain-connector.js" ]]; then
        print_error "区块链连接器文件不存在"
        exit 1
    fi
    
    if [[ ! -f "/opt/orasrs/threat-detection.js" ]]; then
        print_error "威胁检测模块不存在"
        exit 1
    fi
    
    # 如果user-config.json不存在，创建一个默认的
    if [[ ! -f "/opt/orasrs/user-config.json" ]]; then
        cat > /opt/orasrs/user-config.json << EOF
{
  "server": {
    "port": 3006,
    "host": "0.0.0.0",
    "enableLogging": true,
    "logFile": "./logs/orasrs-service.log",
    "rateLimit": {
      "windowMs": 900000,
      "max": 100
    }
  },
  "network": {
    "blockchainEndpoint": "https://api.orasrs.net",
    "chainId": 8888,
    "contractAddress": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  },
  "cache": {
    "enable": true,
    "maxSize": 10000,
    "ttl": 3600000,
    "evictionPolicy": "LRU"
  },
  "security": {
    "enableRateLimiting": true,
    "enableCORS": true,
    "corsOrigin": "*",
    "enableAPIKey": false,
    "apiKeys": [],
    "whitelist": ["127.0.0.1", "localhost", "::1"]
  }
}
EOF
        print_info "已创建默认的用户配置文件"
    fi
    
    print_success "Node.js依赖安装完成"
}

# 配置服务
setup_service() {
    print_info "配置系统服务..."
    
    # 创建systemd服务文件
    cat > /etc/systemd/system/orasrs-client.service << EOF
[Unit]
Description=OraSRS Client Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/orasrs
ExecStart=/usr/bin/node /opt/orasrs/orasrs-simple-client.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=ORASRS_PORT=3006
Environment=ORASRS_HOST=0.0.0.0
Environment=ORASRS_BLOCKCHAIN_ENDPOINT=https://api.orasrs.net
Environment=ORASRS_CHAIN_ID=8888

[Install]
WantedBy=multi-user.target
EOF

    # 重载systemd配置
    systemctl daemon-reload
    
    # 启用服务自启动
    systemctl enable orasrs-client
    
    print_success "系统服务配置完成"
}

# 配置防火墙
setup_firewall() {
    print_info "配置防火墙..."
    
    # 检查防火墙类型
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian 使用 ufw
        ufw allow 3006/tcp
        print_info "已为UFW防火墙开放端口3006"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL 使用 firewalld
        firewall-cmd --permanent --add-port=3006/tcp
        firewall-cmd --reload
        print_info "已为Firewalld开放端口3006"
    elif command -v iptables &> /dev/null; then
        # 使用 iptables
        iptables -A INPUT -p tcp --dport 3006 -j ACCEPT
        print_info "已为iptables开放端口3006"
    else
        print_warning "未检测到支持的防火墙，需手动开放端口3006"
    fi
}

# 启动服务
start_service() {
    print_info "启动OraSRS客户端服务..."
    
    systemctl start orasrs-client
    
    # 等待服务启动
    sleep 5
    
    # 检查服务状态
    if systemctl is-active --quiet orasrs-client; then
        print_success "OraSRS客户端服务启动成功"
    else
        print_error "OraSRS客户端服务启动失败"
        systemctl status orasrs-client
        exit 1
    fi
}

# 显示安装完成信息
show_completion_info() {
    print_success "OraSRS客户端安装完成！"
    echo
    echo -e "${GREEN}服务管理命令:${NC}"
    echo "  启动服务: sudo systemctl start orasrs-client"
    echo "  停止服务: sudo systemctl stop orasrs-client"
    echo "  重启服务: sudo systemctl restart orasrs-client"
    echo "  查看状态: sudo systemctl status orasrs-client"
    echo "  查看日志: sudo journalctl -u orasrs-client -f"
    echo
    echo -e "${GREEN}客户端更新:${NC}"
    echo "  一键更新: curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/update-client.sh | bash"
    echo
    echo -e "${GREEN}API端点:${NC}"
    echo "  健康检查: http://[SERVER_IP]:3006/health"
    echo "  风险查询: http://[SERVER_IP]:3006/orasrs/v1/query?ip=1.2.3.4"
    echo "  威胁检测: http://[SERVER_IP]:3006/orasrs/v1/threats/detected"
    echo "  Gas补贴请求: http://[SERVER_IP]:3006/orasrs/v1/gas-subsidy/request"
    echo "  Gas补贴状态: http://[SERVER_IP]:3006/orasrs/v1/gas-subsidy/status/{address}"
    echo "  检测威胁: http://[SERVER_IP]:3006/orasrs/v1/threats/detected"
    echo "  威胁统计: http://[SERVER_IP]:3006/orasrs/v1/threats/stats"
    echo "  提交威胁: http://[SERVER_IP]:3006/orasrs/v1/threats/submit"
    echo
    echo -e "${GREEN}重要提醒:${NC}"
    echo "  此服务提供咨询建议，最终决策由客户端做出"
    echo "  OraSRS不直接阻断流量，而是提供风险评估供客户端参考"
    echo
    print_success "安装完成！请检查服务状态并根据需要调整配置。"
}

# 主函数
main() {
    print_info "开始安装 OraSRS (Oracle Security Root Service) 客户端..."
    
    check_root
    detect_os
    check_dependencies
    clone_orasrs
    install_node_dependencies
    setup_service
    setup_firewall
    start_service
    show_completion_info
}

# 执行主函数
main