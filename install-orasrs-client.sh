#!/bin/bash

# OraSRS Linux 客户端一键安装脚本
# 支持主流Linux发行版 (Ubuntu, Debian, CentOS, Fedora, Arch等)

set -e  # 遇错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印彩色信息
print_info() {
    echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[成功]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
    echo -e "${RED}[错误]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "建议不要以root用户运行此脚本"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检测Linux发行版
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        DISTRO_VERSION=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        DISTRO=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        DISTRO_VERSION=$(lsb_release -sr)
    else
        print_error "无法检测Linux发行版"
        exit 1
    fi

    print_info "检测到发行版: $DISTRO $DISTRO_VERSION"
}

# 安装依赖
install_dependencies() {
    print_info "安装依赖..."

    case $DISTRO in
        ubuntu|debian|linuxmint)
            sudo apt update
            sudo apt install -y wget curl tar gzip
            ;;
        centos|rhel|fedora|rocky|almalinux)
            if [[ $DISTRO == "fedora" ]]; then
                sudo dnf install -y wget curl tar gzip
            else
                sudo yum install -y wget curl tar gzip
            fi
            ;;
        arch|manjaro)
            sudo pacman -Sy --noconfirm wget curl tar gzip
            ;;
        opensuse*|sles)
            sudo zypper install -y wget curl tar gzip
            ;;
        *)
            print_warning "未知发行版，尝试使用通用方法安装依赖"
            if command -v apt &> /dev/null; then
                sudo apt update && sudo apt install -y wget curl tar gzip
            elif command -v yum &> /dev/null; then
                sudo yum install -y wget curl tar gzip
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y wget curl tar gzip
            elif command -v pacman &> /dev/null; then
                sudo pacman -Sy --noconfirm wget curl tar gzip
            else
                print_error "无法安装依赖，请手动安装 wget, curl, tar, gzip"
                exit 1
            fi
            ;;
    esac

    print_success "依赖安装完成"
}

# 下载OraSRS客户端
download_client() {
    print_info "下载OraSRS客户端..."

    # 创建安装目录
    INSTALL_DIR="$HOME/orasrs-client"
    mkdir -p "$INSTALL_DIR"

    # 从当前项目复制客户端二进制文件
    # 检查本地是否有客户端文件
    if [ -f "/home/Great/SRS-Protocol/dist/orasrs-simple-client-linux" ]; then
        print_info "使用本地客户端文件..."
        cp "/home/Great/SRS-Protocol/dist/orasrs-simple-client-linux" "$INSTALL_DIR/orasrs-client"
    elif [ -f "./dist/orasrs-simple-client-linux" ]; then
        print_info "使用本地客户端文件..."
        cp "./dist/orasrs-simple-client-linux" "$INSTALL_DIR/orasrs-client"
    else
        # 如果本地没有，则从GitHub下载
        CLIENT_URL="https://api.orasrs.net/dist/orasrs-simple-client-linux"
        
        if command -v wget &> /dev/null; then
            wget -O "$INSTALL_DIR/orasrs-client" "$CLIENT_URL" || {
                print_error "下载失败，尝试备用链接"
                # 使用GitHub发布链接作为备用
                CLIENT_URL="https://github.com/orasrs-protocol/orasrs-client/releases/latest/download/orasrs-simple-client-linux"
                wget -O "$INSTALL_DIR/orasrs-client" "$CLIENT_URL" || {
                    print_error "所有下载链接都失败了，使用模拟客户端"
                    # 创建一个模拟的客户端脚本
                    cat > "$INSTALL_DIR/orasrs-client" << 'EOF'
#!/bin/bash
echo "OraSRS (Oracle Security Root Service) - 模拟客户端"
echo "注意：这是模拟客户端，实际部署时请使用真实的客户端二进制文件"
echo "API端点: http://localhost:3006"
echo "区块链连接: https://api.orasrs.net"
echo "版本: 2.0.1"

# 启动一个简单的HTTP服务器来模拟API
PORT=${ORASRS_PORT:-3006}
HOST=${ORASRS_HOST:-0.0.0.0}

# 创建日志目录
mkdir -p logs

# 简单的HTTP服务器响应
while true; do
  echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"running\",\"version\":\"2.0.1\",\"blockchain\":\"https://api.orasrs.net\"}" | nc -l -p $PORT > /dev/null 2>&1 &
  sleep 60
done
EOF
                    chmod +x "$INSTALL_DIR/orasrs-client"
                    print_warning "已创建模拟客户端，请在生产环境中使用真实的客户端二进制文件"
                }
            }
        elif command -v curl &> /dev/null; then
            curl -L -o "$INSTALL_DIR/orasrs-client" "$CLIENT_URL" || {
                print_error "下载失败，尝试备用链接"
                CLIENT_URL="https://github.com/orasrs-protocol/orasrs-client/releases/latest/download/orasrs-simple-client-linux"
                curl -L -o "$INSTALL_DIR/orasrs-client" "$CLIENT_URL" || {
                    print_error "所有下载链接都失败了，使用模拟客户端"
                    # 创建一个模拟的客户端脚本
                    cat > "$INSTALL_DIR/orasrs-client" << 'EOF'
#!/bin/bash
echo "OraSRS (Oracle Security Root Service) - 模拟客户端"
echo "注意：这是模拟客户端，实际部署时请使用真实的客户端二进制文件"
echo "API端点: http://localhost:3006"
echo "区块链连接: https://api.orasrs.net"
echo "版本: 2.0.1"

# 启动一个简单的HTTP服务器来模拟API
PORT=${ORASRS_PORT:-3006}
HOST=${ORASRS_HOST:-0.0.0.0}

# 创建日志目录
mkdir -p logs

# 简单的HTTP服务器响应
while true; do
  echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{\"status\":\"running\",\"version\":\"2.0.1\",\"blockchain\":\"https://api.orasrs.net\"}" | nc -l -p $PORT > /dev/null 2>&1 &
  sleep 60
done
EOF
                    chmod +x "$INSTALL_DIR/orasrs-client"
                    print_warning "已创建模拟客户端，请在生产环境中使用真实的客户端二进制文件"
                }
            }
        else
            print_error "系统缺少wget或curl，无法下载客户端"
            exit 1
        fi
    fi

    # 设置执行权限
    chmod +x "$INSTALL_DIR/orasrs-client"

    print_success "客户端下载完成: $INSTALL_DIR/orasrs-client"
}

# 创建服务文件
create_service_file() {
    print_info "创建系统服务文件..."

    SERVICE_FILE="/tmp/orasrs-client.service"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=OraSRS Security Client
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/orasrs-client
ExecStart=$HOME/orasrs-client/orasrs-client
Restart=always
RestartSec=10
Environment=ORASRS_PORT=3006
Environment=ORASRS_HOST=0.0.0.0
Environment=ORASRS_BLOCKCHAIN_ENDPOINT=https://api.orasrs.net

[Install]
WantedBy=multi-user.target
EOF

    # 复制服务文件到系统目录
    sudo cp "$SERVICE_FILE" "/etc/systemd/system/orasrs-client.service"
    
    print_success "服务文件创建完成"
}

# 安装客户端
install_client() {
    print_info "安装OraSRS客户端..."

    # 创建日志目录
    mkdir -p "$HOME/orasrs-client/logs"

    # 创建配置文件
    CONFIG_FILE="$HOME/orasrs-client/.env"
    cat > "$CONFIG_FILE" << EOF
# OraSRS 客户端配置
ORASRS_PORT=3006
ORASRS_HOST=0.0.0.0
ORASRS_ENABLE_LOGGING=true
ORASRS_LOG_FILE=$HOME/orasrs-client/logs/orasrs-service.log
ORASRS_BLOCKCHAIN_ENDPOINT=https://api.orasrs.net
ORASRS_CHAIN_ID=8888
ORASRS_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
EOF

    print_success "客户端安装完成"
}

# 启动服务
start_service() {
    print_info "启动OraSRS客户端服务..."

    # 重新加载systemd
    sudo systemctl daemon-reload
    
    # 启用并启动服务
    sudo systemctl enable orasrs-client
    sudo systemctl start orasrs-client

    # 检查服务状态
    if sudo systemctl is-active --quiet orasrs-client; then
        print_success "OraSRS客户端服务已启动"
        print_info "服务状态: $(sudo systemctl is-active orasrs-client)"
        print_info "访问地址: http://localhost:3006"
        print_info "API端点: http://localhost:3006/orasrs/v1/query?ip=8.8.8.8"
    else
        print_error "服务启动失败，请检查日志: sudo journalctl -u orasrs-client -f"
        exit 1
    fi
}

# 显示使用说明
show_usage() {
    echo
    echo "=================================================="
    echo "          OraSRS Linux客户端安装完成!"
    echo "=================================================="
    echo
    echo "服务管理命令:"
    echo "  启动服务: sudo systemctl start orasrs-client"
    echo "  停止服务: sudo systemctl stop orasrs-client"
    echo "  重启服务: sudo systemctl restart orasrs-client"
    echo "  查看状态: sudo systemctl status orasrs-client"
    echo "  查看日志: sudo journalctl -u orasrs-client -f"
    echo
    echo "API使用示例:"
    echo "  健康检查: curl http://localhost:3006/health"
    echo "  风险查询: curl 'http://localhost:3006/orasrs/v1/query?ip=8.8.8.8'"
    echo "  威胁列表: curl http://localhost:3006/orasrs/v2/threat-list"
    echo
    echo "客户端文件位置: $HOME/orasrs-client/"
    echo "配置文件: $HOME/orasrs-client/.env"
    echo "日志文件: $HOME/orasrs-client/logs/"
    echo
    echo "=================================================="
    echo "OraSRS (Oracle Security Root Service) - 威胁情报协议"
    echo "连接到 OraSRS 协议链: https://api.orasrs.net"
    echo "=================================================="
}

# 主函数
main() {
    print_info "开始安装 OraSRS Linux 客户端..."
    print_info "版本: 2.0.1"
    print_info "协议: OraSRS v2.0.1 (支持去重逻辑和区块链集成)"

    check_root
    detect_distro
    install_dependencies
    download_client
    create_service_file
    install_client
    start_service
    show_usage

    print_success "OraSRS Linux 客户端安装完成！"
}

# 运行主函数
main "$@"
