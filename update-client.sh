#!/bin/bash

# OraSRS (Oracle Security Root Service) 客户端一键更新脚本
# 用于更新客户端到最新版本，包括API功能更新

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
        print_info "当前为root用户，继续更新"
    else
        print_error "请使用root权限运行此脚本"
        exit 1
    fi
}

# 停止当前运行的服务
stop_service() {
    print_info "停止OraSRS客户端服务..."
    
    # 尝试使用systemctl停止服务
    if systemctl is-active --quiet orasrs-client; then
        systemctl stop orasrs-client
        print_info "已停止systemctl管理的服务"
    fi
    
    # 停止任何可能在运行的手动启动的服务
    pkill -f "node.*orasrs-simple-client" || true
    pkill -f "node.*orasrs-client" || true
    
    sleep 3  # 等待服务完全停止
    
    print_success "服务已停止"
}

# 备份当前配置
backup_config() {
    print_info "备份当前配置..."
    
    if [[ -d "/opt/orasrs" ]]; then
        # 备份配置文件
        if [[ -f "/opt/orasrs/user-config.json" ]]; then
            cp /opt/orasrs/user-config.json /opt/orasrs/user-config.json.bak.$(date +%Y%m%d_%H%M%S)
        fi
        
        # 备份安全配置
        if [[ -f "/opt/orasrs/security-config.json" ]]; then
            cp /opt/orasrs/security-config.json /opt/orasrs/security-config.json.bak.$(date +%Y%m%d_%H%M%S)
        fi
        
        print_success "配置文件已备份"
    else
        print_warning "/opt/orasrs 不存在，跳过备份"
    fi
}

# 更新客户端代码
update_client() {
    print_info "更新OraSRS客户端代码..."
    
    if [[ -d "/opt/orasrs" ]]; then
        cd /opt/orasrs
        
        # 保存当前配置文件
        if [[ -f "user-config.json" ]]; then
            mv user-config.json /tmp/user-config.json.tmp
        fi
        
        if [[ -f "security-config.json" ]]; then
            mv security-config.json /tmp/security-config.json.tmp
        fi
        
        # 获取最新代码
        git fetch origin
        git reset --hard origin/lite-client
        
        # 恢复配置文件
        if [[ -f "/tmp/user-config.json.tmp" ]]; then
            mv /tmp/user-config.json.tmp user-config.json
        fi
        
        if [[ -f "/tmp/security-config.json.tmp" ]]; then
            mv /tmp/security-config.json.tmp security-config.json
        fi
        
        # 安装最新的依赖
        print_info "安装最新依赖..."
        npm install
        
        print_success "客户端代码已更新"
    else
        print_error "/opt/orasrs 目录不存在，请先安装客户端"
        exit 1
    fi
}

# 更新systemd服务配置（如果需要）
update_service_config() {
    print_info "检查并更新systemd服务配置..."
    
    # 检查服务文件是否存在
    if [[ -f "/etc/systemd/system/orasrs-client.service" ]]; then
        # 重新创建服务文件以确保使用最新配置
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
        print_success "systemd服务配置已更新"
    else
        print_warning "systemd服务配置不存在，将使用安装脚本创建"
    fi
}

# 启动服务
start_service() {
    print_info "启动OraSRS客户端服务..."
    
    # 确保服务配置存在
    if [[ ! -f "/etc/systemd/system/orasrs-client.service" ]]; then
        print_info "创建systemd服务配置..."
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
        systemctl daemon-reload
    fi
    
    # 启用并启动服务
    systemctl enable orasrs-client
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

# 验证更新
verify_update() {
    print_info "验证更新..."
    
    # 检查服务是否运行
    if systemctl is-active --quiet orasrs-client; then
        print_info "服务正在运行"
    else
        print_error "服务未运行"
        exit 1
    fi
    
    # 等待API就绪
    sleep 5
    
    # 测试API端点
    if curl -s http://localhost:3006/health >/dev/null 2>&1; then
        print_success "API健康检查端点正常"
        
        # 显示API信息
        API_INFO=$(curl -s http://localhost:3006/ | jq -r '.service' 2>/dev/null || echo "OraSRS (Oracle Security Root Service)")
        print_info "客户端服务: $API_INFO"
    else
        print_warning "API端点暂时不可用，服务可能仍在启动中"
    fi
}

# 显示更新完成信息
show_completion_info() {
    print_success "OraSRS客户端更新完成！"
    echo
    echo -e "${GREEN}更新内容:${NC}"
    echo "  - 客户端代码已更新到最新版本"
    echo "  - RPC节点连接功能已更新"
    echo "  - 中文数据翻译功能已更新"
    echo "  - 新增API功能已包含"
    echo
    echo -e "${GREEN}服务管理命令:${NC}"
    echo "  重启服务: sudo systemctl restart orasrs-client"
    echo "  查看状态: sudo systemctl status orasrs-client"
    echo "  查看日志: sudo journalctl -u orasrs-client -f"
    echo
    echo -e "${GREEN}API端点:${NC}"
    echo "  健康检查: http://localhost:3006/health"
    echo "  风险查询: http://localhost:3006/orasrs/v1/query?ip=1.2.3.4"
    echo "  威胁检测: http://localhost:3006/orasrs/v1/threats/detected"
    echo "  Gas补贴: http://localhost:3006/orasrs/v1/gas-subsidy/request"
    echo
    print_success "客户端已成功更新并重启！"
}

# 主函数
main() {
    print_info "开始更新 OraSRS (Oracle Security Root Service) 客户端..."
    
    check_root
    stop_service
    backup_config
    update_client
    update_service_config
    start_service
    verify_update
    show_completion_info
}

# 执行主函数
main