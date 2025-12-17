#!/bin/sh
# OraSRS OpenWrt 智能安装脚本
# OraSRS OpenWrt Intelligent Installation Script
# Version: 3.1.0

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
    
    # 显示模式名称（大写）
    MODE_UPPER=$(echo "$RECOMMENDED_MODE" | tr 'a-z' 'A-Z')
    print_info "根据硬件配置，推荐模式: ${GREEN}${MODE_UPPER}${NC}"
    
    echo "请选择安装模式 (直接回车将自动选择推荐模式):"
    echo "  1) Edge   - 极简模式 (<5MB RAM, 适合所有设备)"
    echo "  2) Hybrid - 混合模式 (~30MB RAM, 需Python支持)"
    echo "  3) Full   - 完整模式 (~90MB RAM, 仅限x86设备)"
    
    # 如果有参数传入，直接使用
    if [ -n "$1" ]; then
        case "$1" in
            edge|1) INSTALL_MODE="edge" ;;
            hybrid|2) INSTALL_MODE="hybrid" ;;
            full|3) INSTALL_MODE="full" ;;
            *) print_error "无效的模式参数"; exit 1 ;;
        esac
    else
        # 交互式选择
        echo -n "请输入选项 [1-3] (10秒后自动选择): "
        if ! read -t 10 choice; then
            choice=""
            echo "" # 换行
        fi
        
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

# 4. 生成 Edge 客户端 (Shell 版本 - 工业级增强)
generate_edge_client() {
    cat > /usr/bin/orasrs-client << 'EOF'
#!/bin/sh
# OraSRS Edge Client (Shell Version)
# 工业级增强版: 原子更新、并发锁、动态调参

CONFIG_FILE="/etc/config/orasrs"
IPSET_NAME="orasrs_threats"
LOCK_FILE="/var/lock/orasrs.lock"
LOG_FILE="/var/log/orasrs.log"

log() { echo "$(date): $1" >> $LOG_FILE; }

# 读取配置
get_config() {
    LIMIT=$(uci get orasrs.main.limit_rate 2>/dev/null || echo "20/s")
    BURST=$(uci get orasrs.main.limit_burst 2>/dev/null || echo "50")
    SYNC_INTERVAL=$(uci get orasrs.main.sync_interval 2>/dev/null || echo 3600)
}

init_firewall() {
    get_config
    
    # 确保 ipset 存在
    ipset create $IPSET_NAME hash:net -exist
    
    # SYN Flood 防护 (动态可调)
    iptables -N syn_flood 2>/dev/null || true
    iptables -F syn_flood
    iptables -A syn_flood -m limit --limit $LIMIT --limit-burst $BURST -j RETURN
    iptables -A syn_flood -j DROP
    
    # 应用规则 (如果尚未应用)
    if ! iptables -C INPUT -p tcp --syn -j syn_flood 2>/dev/null; then
        iptables -I INPUT -p tcp --syn -j syn_flood
    fi
    
    if ! iptables -C INPUT -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null; then
        iptables -I INPUT -m set --match-set $IPSET_NAME src -j DROP
    fi
    
    if ! iptables -C FORWARD -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null; then
        iptables -I FORWARD -m set --match-set $IPSET_NAME src -j DROP
    fi
    
    log "Firewall initialized. Limit: $LIMIT, Burst: $BURST"
}

sync_threats() {
    (
        flock -x 200
        log "Starting sync..."
        
        # 下载到临时文件
        if curl -s https://feodotracker.abuse.ch/downloads/ipblocklist.txt | grep -v "^#" | grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" > /tmp/orasrs_threats.txt; then
            if [ -s /tmp/orasrs_threats.txt ]; then
                # 原子更新: Create Temp -> Swap -> Destroy
                ipset create ${IPSET_NAME}_tmp hash:net -exist
                ipset flush ${IPSET_NAME}_tmp
                
                while read ip; do
                    ipset add ${IPSET_NAME}_tmp $ip -exist
                done < /tmp/orasrs_threats.txt
                
                ipset swap ${IPSET_NAME}_tmp $IPSET_NAME
                ipset destroy ${IPSET_NAME}_tmp
                
                log "Sync completed. Rules updated atomically."
            else
                log "Sync failed: Empty list."
            fi
        else
            log "Sync failed: Download error."
        fi
        rm -f /tmp/orasrs_threats.txt
        
    ) 200>$LOCK_FILE
}

harden_mode() {
    log "Enabling HARDEN mode..."
    uci set orasrs.main.limit_rate="5/s"
    uci set orasrs.main.limit_burst="10"
    uci commit orasrs
    init_firewall
    log "HARDEN mode enabled (5/s, burst 10)"
}

relax_mode() {
    log "Enabling RELAX mode..."
    uci set orasrs.main.limit_rate="20/s"
    uci set orasrs.main.limit_burst="50"
    uci commit orasrs
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
        ipset test $IPSET_NAME $2 2>/dev/null && echo "THREAT" || echo "SAFE"
        ;;
    add_rule)
        ipset add $IPSET_NAME $2 -exist
        ;;
    harden)
        harden_mode
        ;;
    relax)
        relax_mode
        ;;
    *)
        echo "Usage: $0 {start|reload|check_ip|add_rule|harden|relax}"
        ;;
esac
EOF
    chmod +x /usr/bin/orasrs-client
}

# 5. 生成 Hybrid 客户端 (Python 版本 - 适配新架构)
generate_hybrid_client() {
    cat > /usr/bin/orasrs-client << 'EOF'
#!/usr/bin/env python3
# OraSRS Hybrid Client (Python Version)
import os
import time
import subprocess
import requests
import sys
import fcntl

IPSET_NAME = "orasrs_threats"
LOCK_FILE = "/var/lock/orasrs.lock"
LOG_FILE = "/var/log/orasrs.log"

def log(msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"{time.ctime()}: {msg}\n")

def run_cmd(cmd):
    subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def get_config():
    try:
        limit = subprocess.check_output("uci get orasrs.main.limit_rate", shell=True).decode().strip()
        burst = subprocess.check_output("uci get orasrs.main.limit_burst", shell=True).decode().strip()
        return limit, burst
    except:
        return "20/s", "50"

def init_firewall():
    limit, burst = get_config()
    run_cmd(f"ipset create {IPSET_NAME} hash:net -exist")
    
    # SYN Flood Protection
    run_cmd("iptables -N syn_flood 2>/dev/null || true")
    run_cmd("iptables -F syn_flood")
    run_cmd(f"iptables -A syn_flood -m limit --limit {limit} --limit-burst {burst} -j RETURN")
    run_cmd("iptables -A syn_flood -j DROP")
    
    # Check if rules exist before adding
    res = subprocess.run("iptables -C INPUT -p tcp --syn -j syn_flood", shell=True)
    if res.returncode != 0:
        run_cmd("iptables -I INPUT -p tcp --syn -j syn_flood")
        
    run_cmd(f"iptables -I INPUT -m set --match-set {IPSET_NAME} src -j DROP 2>/dev/null || true")
    run_cmd(f"iptables -I FORWARD -m set --match-set {IPSET_NAME} src -j DROP 2>/dev/null || true")
    log(f"Firewall initialized. Limit: {limit}, Burst: {burst}")

def sync_threats():
    with open(LOCK_FILE, 'w') as lock_f:
        fcntl.flock(lock_f, fcntl.LOCK_EX)
        log("Starting sync...")
        try:
            r = requests.get("https://feodotracker.abuse.ch/downloads/ipblocklist.txt", timeout=30)
            if r.status_code == 200:
                ips = [line for line in r.text.splitlines() if line and not line.startswith("#")]
                
                # Atomic Update
                run_cmd(f"ipset create {IPSET_NAME}_tmp hash:net -exist")
                run_cmd(f"ipset flush {IPSET_NAME}_tmp")
                for ip in ips:
                    run_cmd(f"ipset add {IPSET_NAME}_tmp {ip} -exist")
                
                run_cmd(f"ipset swap {IPSET_NAME}_tmp {IPSET_NAME}")
                run_cmd(f"ipset destroy {IPSET_NAME}_tmp")
                
                log(f"Sync completed. {len(ips)} IPs loaded atomically.")
            else:
                log("Sync failed: HTTP error")
        except Exception as e:
            log(f"Sync failed: {e}")
        fcntl.flock(lock_f, fcntl.LOCK_UN)

def main_loop():
    init_firewall()
    while True:
        sync_threats()
        time.sleep(3600)

if __name__ == "__main__":
    if not os.path.exists(LOCK_FILE):
        open(LOCK_FILE, 'a').close()
        
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "start":
            main_loop()
        elif cmd == "reload":
            init_firewall()
        elif cmd == "check_ip":
            res = subprocess.run(f"ipset test {IPSET_NAME} {sys.argv[2]}", shell=True)
            print("THREAT" if res.returncode == 0 else "SAFE")
        elif cmd == "harden":
            run_cmd("uci set orasrs.main.limit_rate='5/s'")
            run_cmd("uci set orasrs.main.limit_burst='10'")
            run_cmd("uci commit orasrs")
            init_firewall()
            print("HARDEN mode enabled")
        elif cmd == "relax":
            run_cmd("uci set orasrs.main.limit_rate='20/s'")
            run_cmd("uci set orasrs.main.limit_burst='50'")
            run_cmd("uci commit orasrs")
            init_firewall()
            print("RELAX mode enabled")
    else:
        print("Usage: orasrs-client {start|reload|check_ip|harden|relax}")
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
    harden) /usr/bin/orasrs-client harden ;;
    relax) /usr/bin/orasrs-client relax ;;
    *) echo "Usage: orasrs-cli {query|add|sync|harden|relax}" ;;
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
    option limit_rate '20/s'
    option limit_burst '50'
EOF

    # 生成 Init 脚本 (Procd 增强版)
    cat > /etc/init.d/orasrs << 'EOF'
#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

start_service() {
    procd_open_instance
    procd_set_param command /usr/bin/orasrs-client start
    procd_set_param respawn ${respawn_threshold:-3600} ${respawn_timeout:-5} ${respawn_retry:-5}
    procd_set_param stdout 1
    procd_set_param stderr 1
    # Watchdog: 监控配置文件变化
    procd_set_param file /etc/config/orasrs
    procd_close_instance
}

reload_service() {
    /usr/bin/orasrs-client reload
}

service_triggers() {
    procd_add_reload_trigger "orasrs"
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
    echo "  OraSRS OpenWrt 智能安装程序 v3.1.0"
    echo "========================================="
    
    check_environment
    select_mode "$1"
    install_dependencies
    install_orasrs
    
    echo ""
    echo "========================================="
    MODE_UPPER=$(echo "$INSTALL_MODE" | tr 'a-z' 'A-Z')
    echo "  模式: ${MODE_UPPER}"
    echo "  CLI命令: orasrs-cli query <IP>"
    echo "  应急命令: orasrs-cli harden (一键收紧)"
    echo "========================================="
}

main "$@"
