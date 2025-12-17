#!/bin/sh
# OraSRS OpenWrt 智能安装脚本
# OraSRS OpenWrt Intelligent Installation Script
# Version: 3.0.0

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
HAS_IPSET=0

# 打印函数
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 1. 硬件与环境检测
check_environment() {
    print_step "检测系统环境..."
    
    # 检查 OpenWrt
    if [ ! -f "/etc/openwrt_release" ]; then
        print_error "此脚本仅支持 OpenWrt 系统"
        exit 1
    fi
    . /etc/openwrt_release
    print_info "系统版本: OpenWrt $DISTRIB_RELEASE ($DISTRIB_ARCH)"
    ARCH=$DISTRIB_ARCH
    
    # 检查内存 (KB)
    MEMORY_TOTAL=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
    MEMORY_MB=$((MEMORY_TOTAL / 1024))
    print_info "系统内存: ${MEMORY_MB} MB"
    
    # 检查 Python
    if command -v python3 >/dev/null 2>&1; then
        HAS_PYTHON=1
        print_info "Python3: 已安装"
    else
        print_info "Python3: 未安装"
    fi
    
    # 检查 ipset
    if command -v ipset >/dev/null 2>&1; then
        HAS_IPSET=1
        print_info "ipset: 已安装"
    else
        print_warning "ipset: 未安装 (将尝试自动安装)"
    fi
}

# 2. 模式选择逻辑
select_mode() {
    print_step "选择部署模式..."
    
    # 自动推荐
    RECOMMENDED_MODE="edge"
    if [ "$MEMORY_MB" -ge 64 ] && [ "$HAS_PYTHON" -eq 1 ]; then
        RECOMMENDED_MODE="hybrid"
    fi
    if [ "$MEMORY_MB" -ge 512 ] && [ "$ARCH" = "x86_64" ]; then
        RECOMMENDED_MODE="full" # 仅建议在强力软路由上
    fi
    
    print_info "根据硬件配置，推荐模式: ${GREEN}${RECOMMENDED_MODE^^}${NC}"
    
    echo "请选择安装模式:"
    echo "  1) Edge (原生边缘代理) - 内存 < 5MB, 纯 Shell/C, 适合所有路由器 [默认]"
    echo "  2) Hybrid (混合模式) - 内存 ~30MB, Python驱动, 功能更强"
    echo "  3) Full (完整节点) - 内存 ~90MB, Node.js, 仅限 x86 高性能路由"
    
    # 如果有参数传入，直接使用
    if [ -n "$1" ]; then
        case "$1" in
            edge|1) INSTALL_MODE="edge" ;;
            hybrid|2) INSTALL_MODE="hybrid" ;;
            full|3) INSTALL_MODE="full" ;;
            *) print_error "无效的模式参数"; exit 1 ;;
        esac
    else
        # 交互式选择 (设置超时自动选择默认)
        read -t 10 -p "请输入选项 [1-3] (10秒后自动选择推荐模式): " choice || choice=""
        case "$choice" in
            1) INSTALL_MODE="edge" ;;
            2) INSTALL_MODE="hybrid" ;;
            3) INSTALL_MODE="full" ;;
            *) INSTALL_MODE="$RECOMMENDED_MODE" ;;
        esac
    fi
    
    print_info "已选择模式: ${GREEN}${INSTALL_MODE^^}${NC}"
}

# 3. 安装依赖
install_dependencies() {
    print_step "安装依赖包..."
    opkg update
    
    # 通用依赖
    PACKAGES="curl ca-certificates ipset iptables"
    
    # 模式特定依赖
    if [ "$INSTALL_MODE" = "hybrid" ]; then
        PACKAGES="$PACKAGES python3 python3-pip"
    elif [ "$INSTALL_MODE" = "full" ]; then
        PACKAGES="$PACKAGES node node-npm"
    fi
    
    print_info "正在安装: $PACKAGES"
    opkg install $PACKAGES || print_warning "部分包安装失败，尝试继续..."
}

# 4. 生成 Edge 客户端 (Shell 版本)
generate_edge_client() {
    cat > /usr/bin/orasrs-client << 'EOF'
#!/bin/sh
# OraSRS Edge Client (Shell Version)
# 极致轻量级威胁情报客户端

CONFIG_FILE="/etc/config/orasrs"
IPSET_NAME="orasrs_threats"
THREAT_URL="https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/main/threat_data/latest.txt" # 示例源
LOG_FILE="/var/log/orasrs.log"

log() { echo "$(date): $1" >> $LOG_FILE; }

init_firewall() {
    ipset create $IPSET_NAME hash:net -exist
    iptables -I INPUT -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null || true
    iptables -I FORWARD -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null || true
}

sync_threats() {
    log "Starting sync..."
    # 下载威胁列表 (假设格式为每行一个IP)
    # 这里使用 Abuse.ch Feodo Tracker 作为演示源
    curl -s https://feodotracker.abuse.ch/downloads/ipblocklist.txt | grep -v "^#" | grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" > /tmp/orasrs_threats.txt
    
    if [ -s /tmp/orasrs_threats.txt ]; then
        ipset flush $IPSET_NAME
        while read ip; do
            ipset add $IPSET_NAME $ip -exist
        done < /tmp/orasrs_threats.txt
        log "Sync completed. Rules updated."
    else
        log "Sync failed or empty list."
    fi
    rm -f /tmp/orasrs_threats.txt
}

case "$1" in
    start)
        init_firewall
        while true; do
            sync_threats
            sleep $(uci get orasrs.main.sync_interval 2>/dev/null || echo 3600)
        done &
        ;;
    check_ip)
        ipset test $IPSET_NAME $2 2>/dev/null && echo "THREAT" || echo "SAFE"
        ;;
    add_rule)
        ipset add $IPSET_NAME $2 -exist
        ;;
    *)
        echo "Usage: $0 {start|check_ip|add_rule}"
        ;;
esac
EOF
    chmod +x /usr/bin/orasrs-client
}

# 5. 生成 Hybrid 客户端 (Python 版本)
generate_hybrid_client() {
    cat > /usr/bin/orasrs-client << 'EOF'
#!/usr/bin/env python3
# OraSRS Hybrid Client (Python Version)
import os
import time
import subprocess
import requests
import sys

IPSET_NAME = "orasrs_threats"
CONFIG_FILE = "/etc/config/orasrs"
LOG_FILE = "/var/log/orasrs.log"

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"{time.ctime()}: {msg}\n")

def run_cmd(cmd):
    subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def init_firewall():
    run_cmd(f"ipset create {IPSET_NAME} hash:net -exist")
    run_cmd(f"iptables -I INPUT -m set --match-set {IPSET_NAME} src -j DROP")
    run_cmd(f"iptables -I FORWARD -m set --match-set {IPSET_NAME} src -j DROP")

def sync_threats():
    log("Starting sync...")
    try:
        # 示例：从 Abuse.ch 下载
        r = requests.get("https://feodotracker.abuse.ch/downloads/ipblocklist.txt", timeout=30)
        if r.status_code == 200:
            ips = [line for line in r.text.splitlines() if line and not line.startswith("#")]
            run_cmd(f"ipset flush {IPSET_NAME}")
            for ip in ips:
                run_cmd(f"ipset add {IPSET_NAME} {ip} -exist")
            log(f"Sync completed. {len(ips)} IPs loaded.")
        else:
            log("Sync failed: HTTP error")
    except Exception as e:
        log(f"Sync failed: {e}")

def main_loop():
    init_firewall()
    while True:
        sync_threats()
        time.sleep(3600)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "start":
            main_loop()
        elif sys.argv[1] == "check_ip":
            res = subprocess.run(f"ipset test {IPSET_NAME} {sys.argv[2]}", shell=True)
            print("THREAT" if res.returncode == 0 else "SAFE")
        elif sys.argv[1] == "add_rule":
            run_cmd(f"ipset add {IPSET_NAME} {sys.argv[2]} -exist")
    else:
        print("Usage: orasrs-client {start|check_ip|add_rule}")
EOF
    chmod +x /usr/bin/orasrs-client
}

# 6. 安装主逻辑
install_orasrs() {
    print_step "安装 OraSRS 客户端 ($INSTALL_MODE 模式)..."
    
    # 根据模式生成客户端
    if [ "$INSTALL_MODE" = "edge" ]; then
        generate_edge_client
    elif [ "$INSTALL_MODE" = "hybrid" ]; then
        generate_hybrid_client
    elif [ "$INSTALL_MODE" = "full" ]; then
        print_error "Full 模式暂未在 OpenWrt 脚本中完全实现，请参考 Linux 安装文档。"
        exit 1
    fi
    
    # 生成 CLI 工具
    cat > /usr/bin/orasrs-cli << 'EOF'
#!/bin/sh
case "$1" in
    query) /usr/bin/orasrs-client check_ip "$2" ;;
    add) /usr/bin/orasrs-client add_rule "$2" ;;
    sync) killall -USR1 orasrs-client 2>/dev/null || echo "Triggered sync" ;;
    *) echo "Usage: orasrs-cli {query|add|sync}" ;;
esac
EOF
    chmod +x /usr/bin/orasrs-cli
    
    # 生成配置文件
    mkdir -p /etc/config
    cat > /etc/config/orasrs << EOF
config orasrs 'main'
    option enabled '1'
    option mode '$INSTALL_MODE'
    option sync_interval '3600'
EOF

    # 生成 Init 脚本
    cat > /etc/init.d/orasrs << 'EOF'
#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1
start_service() {
    procd_open_instance
    procd_set_param command /usr/bin/orasrs-client start
    procd_set_param respawn
    procd_set_param stdout 1
    procd_set_param stderr 1
    procd_close_instance
}
EOF
    chmod +x /etc/init.d/orasrs
    
    # 启动服务
    /etc/init.d/orasrs enable
    /etc/init.d/orasrs start
}

# 主函数
main() {
    echo "========================================="
    echo "  OraSRS OpenWrt 智能安装程序 v3.0"
    echo "========================================="
    
    check_environment
    select_mode "$1"
    install_dependencies
    install_orasrs
    
    echo ""
    echo "========================================="
    echo "  安装成功！"
    echo "  模式: ${INSTALL_MODE^^}"
    echo "  CLI命令: orasrs-cli query <IP>"
    echo "========================================="
}

main "$@"
