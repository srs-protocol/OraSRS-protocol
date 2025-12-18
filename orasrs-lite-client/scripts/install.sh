#!/bin/bash
# OraSRS Linux 智能安装脚本
# OraSRS Linux Intelligent Installation Script
# Version: 3.2.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 全局变量
INSTALL_MODE=""
MEMORY_TOTAL=0
ARCH=""
HAS_PYTHON=0
HAS_NFT=0
OS=""
DISTRO=""

# 打印函数
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 1. 硬件与环境检测
check_environment() {
    print_step "检测系统环境..."
    
    # 检查 Root
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用 root 权限运行此脚本"
        exit 1
    fi

    # 检测发行版
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        print_info "操作系统: $PRETTY_NAME"
    else
        print_error "无法检测操作系统"
        exit 1
    fi
    
    # 检查内存 (MB)
    MEMORY_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
    print_info "系统内存: ${MEMORY_TOTAL} MB"
    
    # 检查架构
    ARCH=$(uname -m)
    print_info "CPU架构: $ARCH"
    
    # 检查 Python
    if command -v python3 >/dev/null 2>&1; then
        HAS_PYTHON=1
        print_info "Python3: 已安装"
    fi
    
    # 检查 nftables
    if command -v nft >/dev/null 2>&1; then
        HAS_NFT=1
        print_info "nftables: 已安装 (将优先使用)"
    fi
}

# 2. 模式选择逻辑
select_mode() {
    print_step "选择部署模式..."
    
    # 自动推荐
    RECOMMENDED_MODE="edge"
    if [ "$MEMORY_TOTAL" -ge 256 ] && [ "$HAS_PYTHON" -eq 1 ]; then
        RECOMMENDED_MODE="hybrid"
    fi
    if [ "$MEMORY_TOTAL" -ge 1024 ] && [ "$ARCH" == "x86_64" ]; then
        RECOMMENDED_MODE="full"
    fi
    
    MODE_UPPER=$(echo "$RECOMMENDED_MODE" | tr 'a-z' 'A-Z')
    print_info "根据硬件配置，推荐模式: ${GREEN}${MODE_UPPER}${NC}"
    
    echo "请选择安装模式 (直接回车将自动选择推荐模式):"
    echo "  1) Edge   - 极简模式 (<5MB RAM, 适合 VPS/IoT)"
    echo "  2) Hybrid - 混合模式 (~30MB RAM, 需Python)"
    echo "  3) Full   - 完整模式 (~1GB RAM, Node.js 全功能)"
    
    if [ -n "$1" ]; then
        case "$1" in
            edge|1) INSTALL_MODE="edge" ;;
            hybrid|2) INSTALL_MODE="hybrid" ;;
            full|3) INSTALL_MODE="full" ;;
            *) print_error "无效的模式参数"; exit 1 ;;
        esac
    else
        echo -n "请输入选项 [1-3] (10秒后自动选择): "
        read -t 10 choice || choice=""
        echo ""
        
        if [ -z "$choice" ]; then
            print_info "自动选择推荐模式..."
            INSTALL_MODE="$RECOMMENDED_MODE"
        else
            case "$choice" in
                1) INSTALL_MODE="edge" ;;
                2) INSTALL_MODE="hybrid" ;;
                3) INSTALL_MODE="full" ;;
                *) 
                    print_warning "无效输入，使用推荐模式"
                    INSTALL_MODE="$RECOMMENDED_MODE" 
                    ;;
            esac
        fi
    fi
    
    MODE_UPPER=$(echo "$INSTALL_MODE" | tr 'a-z' 'A-Z')
    print_info "已确认安装模式: ${GREEN}${MODE_UPPER}${NC}"
}

# 3. 安装依赖
install_dependencies() {
    print_step "安装依赖包..."
    
    PACKAGES="curl ca-certificates"
    
    if [ "$HAS_NFT" -eq 1 ]; then
        PACKAGES="$PACKAGES nftables"
    else
        PACKAGES="$PACKAGES ipset iptables"
    fi
    
    if [ "$INSTALL_MODE" = "hybrid" ]; then
        PACKAGES="$PACKAGES python3 python3-pip"
    elif [ "$INSTALL_MODE" = "full" ]; then
        PACKAGES="$PACKAGES git nodejs npm"
        # Node.js 源配置略过，假设系统源可用或用户已配置
    fi
    
    if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" ]]; then
        apt-get update
        apt-get install -y $PACKAGES
    elif [[ "$DISTRO" == "centos" || "$DISTRO" == "rhel" || "$DISTRO" == "fedora" ]]; then
        yum install -y $PACKAGES
    fi
}

# 4. 生成 Edge 客户端 (Shell 版本 - 双栈支持)
generate_edge_client() {
    mkdir -p /opt/orasrs/bin
    mkdir -p /etc/orasrs
    
    cat > /opt/orasrs/bin/orasrs-client << 'EOF'
#!/bin/bash
# OraSRS Edge Client (Linux Shell Version)
# 工业级增强版: nftables/ipset 双栈支持、原子更新、并发锁

CONFIG_FILE="/etc/orasrs/config"
LOCK_FILE="/var/lock/orasrs.lock"
LOG_FILE="/var/log/orasrs.log"

# 检测后端
if command -v nft >/dev/null 2>&1; then
    BACKEND="nft"
else
    BACKEND="iptables"
fi

log() { echo "$(date): $1" >> $LOG_FILE; }

# 读取配置
get_config() {
    if [ -f "$CONFIG_FILE" ]; then
        source "$CONFIG_FILE"
    else
        LIMIT="20/s"
        BURST="50"
        SYNC_INTERVAL=3600
    fi
}

init_firewall_nft() {
    NFT_LIMIT=$(echo $LIMIT | sed 's/s/second/')
    
    cat > /tmp/orasrs.nft << NFT
table inet orasrs {
    set threats {
        type ipv4_addr
        flags interval
    }
    
    chain input {
        type filter hook input priority filter; policy accept;
        
        # SYN Flood Protection
        tcp flags syn limit rate $NFT_LIMIT burst $BURST packets return
        tcp flags syn drop
        
        # Threat Blocking
        ip saddr @threats drop
    }
    
    chain forward {
        type filter hook forward priority filter; policy accept;
        ip saddr @threats drop
    }
}
NFT
    nft -f /tmp/orasrs.nft
    log "Firewall initialized (nftables). Limit: $NFT_LIMIT, Burst: $BURST"
}

init_firewall_iptables() {
    IPSET_NAME="orasrs_threats"
    ipset create $IPSET_NAME hash:net -exist
    
    iptables -N syn_flood 2>/dev/null || true
    iptables -F syn_flood
    iptables -A syn_flood -m limit --limit $LIMIT --limit-burst $BURST -j RETURN
    iptables -A syn_flood -j DROP
    
    if ! iptables -C INPUT -p tcp --syn -j syn_flood 2>/dev/null; then
        iptables -I INPUT -p tcp --syn -j syn_flood
    fi
    
    if ! iptables -C INPUT -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null; then
        iptables -I INPUT -m set --match-set $IPSET_NAME src -j DROP
    fi
    
    log "Firewall initialized (iptables). Limit: $LIMIT, Burst: $BURST"
}

init_firewall() {
    get_config
    if [ "$BACKEND" = "nft" ]; then
        init_firewall_nft
    else
        init_firewall_iptables
    fi
}

sync_threats() {
    (
        flock -x 200
        log "Starting sync ($BACKEND)..."
        
        if curl -s https://feodotracker.abuse.ch/downloads/ipblocklist.txt | grep -v "^#" | grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" > /tmp/orasrs_threats.txt; then
            if [ -s /tmp/orasrs_threats.txt ]; then
                if [ "$BACKEND" = "nft" ]; then
                    # nftables 原子更新
                    echo "table inet orasrs {" > /tmp/orasrs_update.nft
                    echo "  set threats {" >> /tmp/orasrs_update.nft
                    echo "    type ipv4_addr; flags interval;" >> /tmp/orasrs_update.nft
                    echo "    elements = {" >> /tmp/orasrs_update.nft
                    awk '{print $1 ","}' /tmp/orasrs_threats.txt >> /tmp/orasrs_update.nft
                    echo "    }" >> /tmp/orasrs_update.nft
                    echo "  }" >> /tmp/orasrs_update.nft
                    echo "}" >> /tmp/orasrs_update.nft
                    
                    if nft -f /tmp/orasrs_update.nft; then
                        log "Sync completed (nftables). Rules updated."
                    else
                        log "Sync failed (nftables): Syntax error."
                    fi
                else
                    # iptables/ipset 原子更新
                    IPSET_NAME="orasrs_threats"
                    ipset create ${IPSET_NAME}_tmp hash:net -exist
                    ipset flush ${IPSET_NAME}_tmp
                    while read ip; do
                        ipset add ${IPSET_NAME}_tmp $ip -exist
                    done < /tmp/orasrs_threats.txt
                    ipset swap ${IPSET_NAME}_tmp $IPSET_NAME
                    ipset destroy ${IPSET_NAME}_tmp
                    log "Sync completed (ipset). Rules updated."
                fi
            else
                log "Sync failed: Empty list."
            fi
        else
            log "Sync failed: Download error."
        fi
        rm -f /tmp/orasrs_threats.txt /tmp/orasrs_update.nft
        
    ) 200>$LOCK_FILE
}

harden_mode() {
    log "Enabling HARDEN mode..."
    sed -i 's/LIMIT=.*/LIMIT="5\/s"/' $CONFIG_FILE
    sed -i 's/BURST=.*/BURST="10"/' $CONFIG_FILE
    init_firewall
    log "HARDEN mode enabled (5/s, burst 10)"
}

relax_mode() {
    log "Enabling RELAX mode..."
    sed -i 's/LIMIT=.*/LIMIT="20\/s"/' $CONFIG_FILE
    sed -i 's/BURST=.*/BURST="50"/' $CONFIG_FILE
    init_firewall
    log "RELAX mode enabled (20/s, burst 50)"
}

case "$1" in
    start)
        init_firewall
        while true; do
            sync_threats
            get_config
            sleep $SYNC_INTERVAL
        done &
        ;;
    reload)
        init_firewall
        ;;
    check_ip)
        if [ "$BACKEND" = "iptables" ]; then
            ipset test orasrs_threats $2 2>/dev/null && echo "THREAT" || echo "SAFE"
        else
            echo "SAFE (nft check not implemented in shell)"
        fi
        ;;
    harden) harden_mode ;;
    relax) relax_mode ;;
    *) echo "Usage: $0 {start|reload|check_ip|harden|relax}" ;;
esac
EOF
    chmod +x /opt/orasrs/bin/orasrs-client
}

# 5. 生成 Hybrid 客户端 (Python 版本)
generate_hybrid_client() {
    # 暂复用 Edge 客户端逻辑，因为 Python 脚本在 Linux 上需要更多适配
    # 且 Edge 客户端已足够强大
    print_warning "Hybrid 模式暂使用增强版 Shell 客户端替代..."
    generate_edge_client
}

# 6. 安装 Full 客户端 (Node.js)
install_full_client() {
    print_step "安装 Full 客户端 (Node.js)..."
    
    mkdir -p /opt/orasrs
    cd /opt/orasrs
    
    # 克隆代码 (如果不存在)
    if [ ! -d ".git" ]; then
        git clone https://github.com/srs-protocol/OraSRS-protocol.git .
        git checkout lite-client
    else
        git pull origin lite-client
    fi
    
    # 安装依赖
    cd orasrs-lite-client
    npm install
    
    # 创建启动脚本
    cat > /opt/orasrs/bin/orasrs-client << 'EOF'
#!/bin/bash
cd /opt/orasrs/orasrs-lite-client
npm start
EOF
    chmod +x /opt/orasrs/bin/orasrs-client
}

# 7. 配置 Systemd
setup_systemd() {
    print_step "配置 Systemd 服务..."
    
    cat > /etc/systemd/system/orasrs.service << EOF
[Unit]
Description=OraSRS Threat Defense Client
After=network.target

[Service]
Type=simple
ExecStart=/opt/orasrs/bin/orasrs-client start
ExecReload=/opt/orasrs/bin/orasrs-client reload
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable orasrs
    systemctl start orasrs
}

# 8. 生成 CLI 工具
generate_cli() {
    cat > /usr/bin/orasrs-cli << 'EOF'
#!/bin/bash
case "$1" in
    query) /opt/orasrs/bin/orasrs-client check_ip "$2" ;;
    add) /opt/orasrs/bin/orasrs-client add_rule "$2" ;;
    sync) pkill -USR1 -f orasrs-client || echo "Triggered sync" ;;
    harden) /opt/orasrs/bin/orasrs-client harden ;;
    relax) /opt/orasrs/bin/orasrs-client relax ;;
    *) echo "Usage: orasrs-cli {query|add|sync|harden|relax}" ;;
esac
EOF
    chmod +x /usr/bin/orasrs-cli
}

# 9. 生成配置文件
generate_config() {
    mkdir -p /etc/orasrs
    cat > /etc/orasrs/config << EOF
LIMIT="20/s"
BURST="50"
SYNC_INTERVAL=3600
MODE="$INSTALL_MODE"
EOF
}

# 主函数
main() {
    echo "========================================="
    echo "  OraSRS Linux 智能安装程序 v3.2.0"
    echo "========================================="
    
    check_environment
    select_mode "$1"
    install_dependencies
    
    if [ "$INSTALL_MODE" = "full" ]; then
        install_full_client
    else
        generate_edge_client
        generate_config
        generate_cli
        setup_systemd
    fi
    
    echo ""
    echo "========================================="
    MODE_UPPER=$(echo "$INSTALL_MODE" | tr 'a-z' 'A-Z')
    echo "  模式: ${MODE_UPPER}"
    if [ "$HAS_NFT" -eq 1 ]; then
        echo "  后端: nftables (高性能)"
    else
        echo "  后端: iptables (传统)"
    fi
    echo "  CLI命令: orasrs-cli query <IP>"
    echo "  应急命令: orasrs-cli harden"
    echo "========================================="
}

main "$@"