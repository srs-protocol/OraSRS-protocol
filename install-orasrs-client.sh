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

# 选择语言
select_language() {
    echo ""
    echo "Please select language / 请选择语言:"
    echo "  1) English"
    echo "  2) 中文 (Chinese)"
    echo ""
    
    # Try to read from /dev/tty if available (for piped execution)
    if [ -t 0 ]; then
        read -p "Select [1-2]: " lang_choice
    else
        read -p "Select [1-2]: " lang_choice < /dev/tty
    fi
    
    mkdir -p /etc/orasrs
    
    case $lang_choice in
        1)
            echo '{"language": "en"}' > /etc/orasrs/cli-config.json
            print_info "Language set to English"
            ;;
        2)
            echo '{"language": "zh"}' > /etc/orasrs/cli-config.json
            print_info "语言已设置为中文"
            ;;
        *)
            echo '{"language": "en"}' > /etc/orasrs/cli-config.json
            print_info "Invalid selection, defaulting to English"
            ;;
    esac
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

# 检查 eBPF 依赖（可选）
check_ebpf_dependencies() {
    print_info "检查 eBPF 内核加速支持..."
    
    # 检查内核版本
    KERNEL_VERSION=$(uname -r | cut -d. -f1-2)
    KERNEL_MAJOR=$(echo $KERNEL_VERSION | cut -d. -f1)
    KERNEL_MINOR=$(echo $KERNEL_VERSION | cut -d. -f2)
    
    if [ "$KERNEL_MAJOR" -lt 4 ] || ([ "$KERNEL_MAJOR" -eq 4 ] && [ "$KERNEL_MINOR" -lt 8 ]); then
        print_warning "内核版本 $KERNEL_VERSION 不支持 eBPF XDP (需要 >= 4.8)"
        print_info "eBPF 内核加速将被禁用，客户端将以纯缓存模式运行"
        return 1
    fi
    
    print_success "内核版本 $KERNEL_VERSION 支持 eBPF"
    
    # 检查 Python3
    if ! command -v python3 &> /dev/null; then
        print_warning "Python3 未安装，eBPF 功能需要 Python3"
        return 1
    fi
    
    # 检查 BCC 工具
    if ! python3 -c "from bcc import BPF" 2>/dev/null; then
        print_warning "BCC (BPF Compiler Collection) 未安装"
        print_info "是否安装 BCC 以启用 eBPF 内核加速？(y/n)"
        
        if [ -t 0 ]; then
            read -p "选择 [y/n]: " install_bcc
        else
            read -p "选择 [y/n]: " install_bcc < /dev/tty
        fi
        
        if [[ "$install_bcc" == "y" || "$install_bcc" == "Y" ]]; then
            print_info "安装 BCC..."
            if [[ "$OS" == *"Ubuntu"* || "$OS" == *"Debian"* ]]; then
                apt update && apt install -y bpfcc-tools python3-bpfcc linux-headers-$(uname -r)
            elif [[ "$OS" == *"CentOS"* || "$OS" == *"Red Hat"* || "$OS" == *"Rocky"* || "$OS" == *"AlmaLinux"* ]]; then
                yum install -y bcc-tools python3-bcc kernel-devel-$(uname -r)
            elif [[ "$OS" == *"Fedora"* ]]; then
                dnf install -y bcc-tools python3-bcc kernel-devel-$(uname -r)
            else
                print_warning "不支持的操作系统，无法自动安装 BCC"
                return 1
            fi
            
            # 验证安装
            if python3 -c "from bcc import BPF" 2>/dev/null; then
                print_success "BCC 安装成功"
                return 0
            else
                print_warning "BCC 安装失败"
                return 1
            fi
        else
            print_info "跳过 BCC 安装，eBPF 功能将被禁用"
            return 1
        fi
    else
        print_success "BCC 已安装"
        return 0
    fi
}

# 克隆OraSRS项目
clone_orasrs() {
    print_info "克隆OraSRS项目..."
    
    if [[ -d "/opt/orasrs" ]]; then
        print_warning "/opt/orasrs 已存在，正在更新..."
        cd /opt/orasrs
        # 强制更新到最新版本，丢弃本地更改
        git fetch origin lite-client
        git reset --hard origin/lite-client
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
    if [[ ! -f "/opt/orasrs/orasrs-simple-client.js" ]]; then
        print_error "OraSRS简单客户端文件不存在"
        exit 1
    fi
    
    # 安装CLI工具
    print_info "安装OraSRS CLI工具..."
    chmod +x /opt/orasrs/orasrs-cli.js
    
    # 创建符号链接到 /usr/local/bin
    if [ -f /opt/orasrs/orasrs-cli.js ]; then
        ln -sf /opt/orasrs/orasrs-cli.js /usr/local/bin/orasrs-cli
        print_success "CLI工具已安装: orasrs-cli"
    fi
    
    print_success "Node.js依赖安装完成"
}

# 配置服务
setup_service() {
    print_info "配置系统服务..."
    
    # 检查系统是否支持systemd (通过检查init进程是否是systemd)
    if [ -d /run/systemd/system ] || [ -e /run/systemd/private ]; then
        # 检查服务文件是否存在
        if [[ -f "/etc/systemd/system/orasrs-client.service" ]]; then
            print_warning "服务文件已存在，跳过覆盖以保留自定义配置。"
            print_info "更新 ORASRS_HOST 为 127.0.0.1 以限制本地访问..."
            sed -i 's/Environment=ORASRS_HOST=0.0.0.0/Environment=ORASRS_HOST=127.0.0.1/' /etc/systemd/system/orasrs-client.service
            systemctl daemon-reload 2>/dev/null || true
        else
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
Environment=ORASRS_HOST=127.0.0.1
Environment=ORASRS_BLOCKCHAIN_ENDPOINT=https://api.orasrs.net
Environment=ORASRS_CHAIN_ID=8888
Environment=ORASRS_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

[Install]
WantedBy=multi-user.target
EOF

            # 重载systemd配置
            systemctl daemon-reload 2>/dev/null || true
            
            # 启用服务自启动
            systemctl enable orasrs-client 2>/dev/null || true
            
            print_success "systemd服务配置完成"
        fi
    else
        print_warning "系统不支持systemd，跳过服务配置"
        print_info "可以手动启动服务: cd /opt/orasrs && node orasrs-simple-client.js &"
    fi
}

# 下载威胁情报数据
download_threat_intelligence() {
    print_info "下载威胁情报数据..."
    
    # 创建oracle目录
    mkdir -p /opt/orasrs/oracle
    
    # 尝试从CDN下载（如果配置了）
    # 目前从GitHub下载
    if cd /opt/orasrs && [ -d .git ]; then
        # 如果是git仓库，直接pull
        git pull origin lite-client 2>/dev/null || true
    fi
    
    # 检查威胁情报文件是否存在
    if [ -f /opt/orasrs/oracle/threats_compact.json ]; then
        print_success "威胁情报数据已加载: $(du -h /opt/orasrs/oracle/threats_compact.json | cut -f1)"
        
        # 初始化客户端缓存
        if [ -f /opt/orasrs/threat-data-loader.js ]; then
            print_info "初始化威胁情报缓存..."
            cd /opt/orasrs
            node threat-data-loader.js > /dev/null 2>&1 || print_warning "威胁情报缓存初始化失败（服务启动时会自动重试）"
        fi
    else
        print_warning "威胁情报数据文件不存在"
        print_info "服务启动时将自动从区块链同步"
    fi
    
    # 创建缓存目录
    mkdir -p /var/lib/orasrs
    chmod 755 /var/lib/orasrs
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
    
    # 检查系统是否支持systemd (通过检查init进程是否是systemd)
    if [ -d /run/systemd/system ] || [ -e /run/systemd/private ]; then
        systemctl restart orasrs-client 2>/dev/null || true
        
        # 等待服务启动
        sleep 5
        
        # 检查服务状态
        if systemctl is-active --quiet orasrs-client 2>/dev/null; then
            print_success "OraSRS客户端服务启动成功"
        else
            print_warning "systemd服务可能未启动，尝试手动启动..."
            cd /opt/orasrs
            # 在后台启动服务并输出到日志
            nohup node orasrs-simple-client.js > orasrs-client.log 2>&1 &
            sleep 5
            
            # 检查进程是否启动
            if pgrep -f "node.*orasrs-simple-client" > /dev/null; then
                print_success "OraSRS客户端服务已手动启动"
                echo "PID: $(pgrep -f 'node.*orasrs-simple-client')"
            else
                print_error "OraSRS客户端服务启动失败"
                exit 1
            fi
        fi
    else
        print_warning "系统不支持systemd，尝试手动启动服务..."
        cd /opt/orasrs
        # 在后台启动服务并输出到日志
        nohup node orasrs-simple-client.js > orasrs-client.log 2>&1 &
        sleep 5
        
        # 检查进程是否启动
        if pgrep -f "node.*orasrs-simple-client" > /dev/null; then
            print_success "OraSRS客户端服务已手动启动"
            echo "PID: $(pgrep -f 'node.*orasrs-simple-client')"
        else
            print_error "OraSRS客户端服务启动失败"
            exit 1
        fi
    fi
}

# 显示安装完成信息
show_completion_info() {
    print_success "OraSRS客户端安装完成！"
    echo
    echo -e "${GREEN}CLI命令 (推荐):${NC}"
    echo "  查看状态: orasrs-cli status"
    echo "  查询IP: orasrs-cli query <ip>"
    echo "  初始化: orasrs-cli init"
    echo "  统计信息: orasrs-cli stats"
    echo "  查看配置: orasrs-cli config"
    echo "  查看日志: orasrs-cli logs"
    echo "  运行测试: orasrs-cli test"
    echo "  内核加速: orasrs-cli kernel"
    echo "  详细统计: orasrs-cli kernel --detailed"
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
    echo "  健康检查: http://localhost:3006/health"
    echo "  风险查询: http://localhost:3006/orasrs/v1/query?ip=1.2.3.4"
    echo "  威胁检测: http://localhost:3006/orasrs/v1/threats/detected"
    echo "  威胁统计: http://localhost:3006/orasrs/v1/threats/stats"
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
    select_language
    detect_os
    check_dependencies
    check_ebpf_dependencies  # 检查 eBPF 支持（可选）
    clone_orasrs
    install_node_dependencies
    setup_service
    download_threat_intelligence
    setup_firewall
    start_service
    show_completion_info
}

# 执行主函数
main