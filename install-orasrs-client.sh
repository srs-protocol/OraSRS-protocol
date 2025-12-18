#!/bin/bash

# OraSRS Linux Client Installation Script - T0 Only (v3.3.6 Final)
# -----------------------------------------------------------------------
# [IMPORTANT] Project Status: CONCLUDED / 已结项
# This is the final T0-focused version. NO blockchain/T2/T3 features.
# Pure kernel-level defense using iptables/ipset + public threat feeds.
# -----------------------------------------------------------------------
# Scientific Reference: DOI 10.31224/5985
# IETF Draft: draft-luo-orasrs-decentralized-threat-signaling-01
# -----------------------------------------------------------------------

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print functions
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用root权限运行此脚本 / Please run as root"
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        print_info "检测到操作系统: $OS"
    else
        print_error "无法检测操作系统"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_info "安装依赖..."
    
    if [[ "$OS" == *"Ubuntu"* || "$OS" == *"Debian"* ]]; then
        apt update
        apt install -y iptables ipset curl
    elif [[ "$OS" == *"CentOS"* || "$OS" == *"Red Hat"* || "$OS" == *"Rocky"* || "$OS" == *"AlmaLinux"* ]]; then
        yum install -y iptables ipset curl
    elif [[ "$OS" == *"Fedora"* ]]; then
        dnf install -y iptables ipset curl
    elif [[ "$OS" == *"Arch"* ]]; then
        pacman -Sy --noconfirm iptables ipset curl
    else
        print_warning "未知操作系统，尝试使用通用方法..."
    fi
    
    print_success "依赖安装完成"
}

# Create client script
create_client_script() {
    print_info "创建OraSRS客户端脚本..."
    
    cat > /usr/local/bin/orasrs-client << 'EOF'
#!/bin/bash
# OraSRS T0 Client (Linux Version) v3.3.6
# Pure kernel-level defense with public threat feeds

CONFIG_FILE="/etc/orasrs/config"
LOG_FILE="/var/log/orasrs.log"
IPSET_NAME="orasrs_threats"

log() { echo "$(date): $1" >> $LOG_FILE; }

# Read config
get_config() {
    if [ -f "$CONFIG_FILE" ]; then
        . "$CONFIG_FILE"
    else
        LIMIT_RATE="${LIMIT_RATE:-20/s}"
        LIMIT_BURST="${LIMIT_BURST:-50}"
        SYNC_INTERVAL="${SYNC_INTERVAL:-3600}"
    fi
}

# Initialize firewall
init_firewall() {
    get_config
    
    # Load kernel modules
    modprobe ip_set 2>/dev/null || true
    modprobe ip_set_hash_net 2>/dev/null || true
    modprobe xt_set 2>/dev/null || true
    modprobe xt_limit 2>/dev/null || true
    modprobe xt_conntrack 2>/dev/null || true
    
    # Create ipset
    ipset create $IPSET_NAME hash:net -exist 2>/dev/null
    
    # Get SSH port
    SSH_PORT=$(ss -tlnp | grep sshd | awk '{print $4}' | grep -oP ':\K[0-9]+$' | head -1)
    SSH_PORT=${SSH_PORT:-22}
    
    # Clean old rules
    iptables -D INPUT -j orasrs_chain 2>/dev/null || true
    iptables -F orasrs_chain 2>/dev/null || true
    iptables -X orasrs_chain 2>/dev/null || true
    
    # Create custom chain
    iptables -N orasrs_chain
    
    # 1. Accept loopback
    iptables -A orasrs_chain -i lo -j ACCEPT
    
    # 2. Connection tracking
    iptables -A orasrs_chain -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    iptables -A orasrs_chain -m conntrack --ctstate INVALID -j DROP
    
    # 3. Threat blocking (T0)
    iptables -A orasrs_chain -m set --match-set $IPSET_NAME src -j DROP
    
    # 4. SSH protection
    iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -m recent --name SSH --set
    iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -m recent --name SSH --update --seconds 60 --hitcount 4 -j DROP
    iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -j ACCEPT
    
    # 5. SYN flood protection
    iptables -A orasrs_chain -p tcp --syn -m limit --limit $LIMIT_RATE --limit-burst $LIMIT_BURST -j ACCEPT
    iptables -A orasrs_chain -p tcp --syn -j DROP
    
    # Insert at top of INPUT chain
    iptables -I INPUT 1 -j orasrs_chain
    
    log "Firewall initialized. Limit: $LIMIT_RATE, Burst: $LIMIT_BURST, SSH: $SSH_PORT"
}

# Sync threats from public feeds
sync_threats() {
    log "Starting threat sync from public feeds..."
    
    # Public threat feed URLs
    URLS=(
        "https://feodotracker.abuse.ch/downloads/ipblocklist.txt"
        "https://rules.emergingthreats.net/blockrules/compromised-ips.txt"
    )
    
    SUCCESS=0
    for URL in "${URLS[@]}"; do
        if curl -s --connect-timeout 10 "$URL" | grep -v "^#" | grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" > /tmp/orasrs_threats.txt; then
            if [ -s /tmp/orasrs_threats.txt ]; then
                SUCCESS=1
                log "Downloaded threats from $URL"
                break
            fi
        fi
    done
    
    if [ $SUCCESS -eq 1 ]; then
        # Atomic ipset update
        ipset create ${IPSET_NAME}_tmp hash:net -exist
        ipset flush ${IPSET_NAME}_tmp
        while read ip; do
            ipset add ${IPSET_NAME}_tmp "$ip" -exist
        done < /tmp/orasrs_threats.txt
        ipset swap ${IPSET_NAME}_tmp $IPSET_NAME
        ipset destroy ${IPSET_NAME}_tmp
        
        THREAT_COUNT=$(ipset list $IPSET_NAME | grep -c "^[0-9]" || echo "0")
        log "Sync completed. Threats loaded: $THREAT_COUNT"
    else
        log "Sync failed: All sources unreachable"
    fi
    
    rm -f /tmp/orasrs_threats.txt
}

# Main daemon loop
daemon() {
    init_firewall
    
    while true; do
        sync_threats
        get_config
        sleep $SYNC_INTERVAL
    done
}

# Commands
case "$1" in
    start)
        daemon &
        echo $! > /var/run/orasrs.pid
        log "OraSRS client started (PID: $!)"
        ;;
    stop)
        if [ -f /var/run/orasrs.pid ]; then
            PID=$(cat /var/run/orasrs.pid)
            kill $PID 2>/dev/null || true
            rm -f /var/run/orasrs.pid
            log "OraSRS client stopped"
        fi
        ;;
    reload)
        init_firewall
        ;;
    status)
        echo "=== OraSRS T0 Client Status ==="
        echo "Backend: iptables/ipset"
        echo ""
        echo "--- IPTABLES (orasrs_chain) ---"
        iptables -nvL orasrs_chain 2>/dev/null || echo "Chain not found"
        echo ""
        echo "--- IPSET ---"
        THREAT_COUNT=$(ipset list $IPSET_NAME 2>/dev/null | grep -c "^[0-9]" || echo "0")
        echo "Threats loaded: $THREAT_COUNT"
        ;;
    sync)
        sync_threats
        ;;
    check)
        if [ -z "$2" ]; then
            echo "Usage: $0 check <IP>"
            exit 1
        fi
        ipset test $IPSET_NAME "$2" 2>/dev/null && echo "THREAT" || echo "SAFE"
        ;;
    *)
        echo "Usage: $0 {start|stop|reload|status|sync|check <IP>}"
        exit 1
        ;;
esac
EOF
    
    chmod +x /usr/local/bin/orasrs-client
    print_success "客户端脚本创建完成"
}

# Create config file
create_config() {
    print_info "创建配置文件..."
    
    mkdir -p /etc/orasrs
    cat > /etc/orasrs/config << 'EOF'
# OraSRS T0 Configuration
LIMIT_RATE="20/s"
LIMIT_BURST="50"
SYNC_INTERVAL="3600"
EOF
    
    print_success "配置文件创建完成: /etc/orasrs/config"
}

# Create systemd service
create_service() {
    print_info "创建systemd服务..."
    
    cat > /etc/systemd/system/orasrs.service << 'EOF'
[Unit]
Description=OraSRS T0 Threat Defense Service
After=network.target

[Service]
Type=forking
ExecStart=/usr/local/bin/orasrs-client start
ExecStop=/usr/local/bin/orasrs-client stop
ExecReload=/usr/local/bin/orasrs-client reload
PIDFile=/var/run/orasrs.pid
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable orasrs
    
    print_success "systemd服务创建完成"
}

# Start service
start_service() {
    print_info "启动OraSRS服务..."
    
    systemctl start orasrs
    sleep 2
    
    if systemctl is-active --quiet orasrs; then
        print_success "OraSRS服务启动成功"
    else
        print_error "服务启动失败，查看日志: journalctl -u orasrs -f"
        exit 1
    fi
}

# Show usage
show_usage() {
    echo ""
    echo "=================================================="
    echo "     OraSRS T0 Client 安装完成 (v3.3.6)"
    echo "=================================================="
    echo ""
    echo "服务管理:"
    echo "  systemctl start orasrs    - 启动服务"
    echo "  systemctl stop orasrs     - 停止服务"
    echo "  systemctl restart orasrs  - 重启服务"
    echo "  systemctl status orasrs   - 查看状态"
    echo ""
    echo "命令行工具:"
    echo "  orasrs-client status      - 查看防护状态"
    echo "  orasrs-client sync        - 手动同步威胁数据"
    echo "  orasrs-client check <IP>  - 检查IP是否在黑名单"
    echo ""
    echo "配置文件: /etc/orasrs/config"
    echo "日志文件: /var/log/orasrs.log"
    echo ""
    echo "=================================================="
    echo "OraSRS - T0 Kernel Defense (Pure iptables/ipset)"
    echo "威胁源: Feodo Tracker + EmergingThreats"
    echo "=================================================="
}

# Main
main() {
    echo "=================================================="
    echo " OraSRS Linux T0 Client 安装程序 (v3.3.6 Final)"
    echo "=================================================="
    echo ""
    print_warning "注意: 此版本仅包含 T0 内核防御功能"
    print_warning "不包含 Node.js/区块链/T2/T3 功能"
    echo ""
    
    check_root
    detect_os
    install_dependencies
    create_client_script
    create_config
    create_service
    start_service
    show_usage
    
    print_success "安装完成！"
}

main "$@"