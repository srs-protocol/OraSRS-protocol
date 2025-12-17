#!/bin/sh
# OraSRS OpenWrt 智能安装脚本
# OraSRS OpenWrt Intelligent Installation Script
# Version: 3.3.6
# Updated: 2025-12-18

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
HAS_NODE=0
INSTALL_LUCI=0
REPO_URL="https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client"

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
    fi

    # 检查 Node.js
    if command -v node >/dev/null 2>&1; then
        HAS_NODE=1
        print_info "Node.js: 已安装"
    fi
    
    # 检查 LuCI
    if [ -d "/usr/lib/lua/luci" ]; then
        print_info "LuCI: 检测到 Web 界面环境"
        INSTALL_LUCI=1
    fi
}

# 2. 模式选择逻辑
select_mode() {
    print_step "选择部署模式..."
    
    # 自动推荐
    RECOMMENDED_MODE="edge"
    if [ "$MEMORY_MB" -ge 256 ]; then
        RECOMMENDED_MODE="hybrid"
    fi
    if [ "$MEMORY_MB" -ge 512 ] && [ "$ARCH" = "x86_64" ]; then
        RECOMMENDED_MODE="full"
    fi
    
    # 显示模式名称（大写）
    MODE_UPPER=$(echo "$RECOMMENDED_MODE" | tr 'a-z' 'A-Z')
    print_info "根据硬件配置，推荐模式: ${GREEN}${MODE_UPPER}${NC}"
    
    echo "请选择安装模式 (直接回车将自动选择推荐模式):"
    echo "  1) Edge   - 极简模式 (<5MB RAM, Shell脚本, 仅T0+T3基础)"
    echo "  2) Hybrid - 混合模式 (~10MB RAM, Node.js, T0+T3完整功能)"
    echo "  3) Full   - 完整模式 (~20MB RAM, Node.js, T0-T3全功能)"
    
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
    PACKAGES="curl ca-certificates ipset iptables iptables-mod-conntrack-extra"
    
    # 模式特定依赖
    if [ "$INSTALL_MODE" = "hybrid" ] || [ "$INSTALL_MODE" = "full" ]; then
        PACKAGES="$PACKAGES node node-npm sqlite3-cli"
        # 尝试安装 node-sqlite3 如果可用，否则依赖纯 JS 或 CLI
        # opkg install node-sqlite3 2>/dev/null || true
    fi
    
    print_info "正在安装: $PACKAGES"
    opkg install $PACKAGES || print_warning "部分包安装失败，尝试继续..."
}

# 4. 生成 Edge 客户端 (Shell 版本 - 增强版)
generate_edge_client() {
    cat > /usr/bin/orasrs-client << 'EOF'
#!/bin/sh
# OraSRS Edge Client (Shell Version) v3.3.0
# T0 (Local) + T3 (Public Feeds)

CONFIG_FILE="/etc/config/orasrs"
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
    
    # 自动加载内核模块
    modprobe ip_set 2>/dev/null
    modprobe ip_set_hash_net 2>/dev/null
    modprobe xt_set 2>/dev/null
    modprobe xt_limit 2>/dev/null
    modprobe xt_conntrack 2>/dev/null

    IPSET_NAME="orasrs_threats"
    ipset create $IPSET_NAME hash:net -exist
    
    # 获取 SSH 端口
    SSH_PORT=$(grep "^Port" /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}')
    SSH_PORT=${SSH_PORT:-22}
    
    # 清理旧规则
    iptables -D INPUT -j orasrs_chain 2>/dev/null || true
    iptables -F orasrs_chain 2>/dev/null || true
    iptables -X orasrs_chain 2>/dev/null || true
    
    # 创建自定义链
    iptables -N orasrs_chain
    
    # 1. Accept Established/Related
    iptables -A orasrs_chain -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
    
    # 2. Drop Invalid
    iptables -A orasrs_chain -m conntrack --ctstate INVALID -j DROP
    
    # 3. Whitelist SSH SYN
    iptables -A orasrs_chain -p tcp --dport $SSH_PORT --syn -j ACCEPT
    
    # 4. SYN Flood Protection
    iptables -A orasrs_chain -p tcp --syn -m limit --limit $LIMIT --limit-burst $BURST -j ACCEPT
    iptables -A orasrs_chain -p tcp --syn -j DROP
    
    # 5. Threat Blocking
    iptables -A orasrs_chain -m set --match-set $IPSET_NAME src -j DROP
    
    # 插入到 INPUT 链顶部
    iptables -I INPUT -j orasrs_chain
    
    log "Firewall initialized (iptables). Limit: $LIMIT, Burst: $BURST, SSH: $SSH_PORT"
}

sync_threats() {
    (
        flock -x 200
        log "Starting sync (Shell/Public Feeds)..."
        
        # 多源回退策略
        URLS="https://feodotracker.abuse.ch/downloads/ipblocklist.txt https://rules.emergingthreats.net/blockrules/compromised-ips.txt"
        SUCCESS=0
        
        for URL in $URLS; do
            if curl -s --connect-timeout 10 "$URL" | grep -v "^#" | grep -E "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" > /tmp/orasrs_threats.txt; then
                if [ -s /tmp/orasrs_threats.txt ]; then
                    SUCCESS=1
                    log "Downloaded threats from $URL"
                    break
                fi
            fi
        done

        if [ $SUCCESS -eq 1 ]; then
            # iptables/ipset 原子更新
            IPSET_NAME="orasrs_threats"
            ipset create ${IPSET_NAME}_tmp hash:net -exist
            ipset flush ${IPSET_NAME}_tmp
            while read ip; do
                ipset add ${IPSET_NAME}_tmp $ip -exist
            done < /tmp/orasrs_threats.txt
            ipset swap ${IPSET_NAME}_tmp $IPSET_NAME
            ipset destroy ${IPSET_NAME}_tmp
            log "Sync completed. Rules updated."
        else
            log "Sync failed: All sources unreachable."
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
        ipset test orasrs_threats $2 2>/dev/null && echo "THREAT" || echo "SAFE"
        ;;
    harden) harden_mode ;;
    relax) relax_mode ;;
    cache_stats)
        ipset list orasrs_threats -t 2>/dev/null | grep "Number of entries" || echo "Number of entries: 0"
        ;;
    cache_list)
        ipset list orasrs_threats | head -n 20
        ;;
    cache_clear)
        ipset flush orasrs_threats
        log "Cache cleared by user."
        echo "Cache cleared."
        ;;
    status)
        echo "Backend: iptables (Shell Client)"
        echo "--- IPTABLES (orasrs_chain) ---"
        iptables -nvL orasrs_chain 2>/dev/null || echo "Chain 'orasrs_chain' not found"
        echo "--- IPSET ---"
        ipset list orasrs_threats -t 2>/dev/null | grep "Number of entries" || echo "No ipset found"
        ;;
    monitor)
        while true; do
            clear
            echo "=== OraSRS Real-time Monitor ==="
            echo "Time: $(date '+%H:%M:%S')"
            echo "Load: $(uptime | awk -F'load average:' '{ print $2 }')"
            echo "Mem:  $(free -m | awk '/Mem:/ { print $3"/"$2" MB" }')"
            echo "--------------------------------"
            CHAIN_OUTPUT=$(iptables -nvL orasrs_chain 2>/dev/null)
            SYN_DROP=$(echo "$CHAIN_OUTPUT" | awk '/flags:0x17\/0x02.*DROP/ {print $1; exit}')
            THREAT_DROP=$(echo "$CHAIN_OUTPUT" | awk '/match-set.*DROP/ {print $1; exit}')
            echo "SYN Flood Dropped: ${SYN_DROP:-0}"
            echo "Threats Dropped:   ${THREAT_DROP:-0}"
            echo "--------------------------------"
            echo "Press Ctrl+C to exit"
            sleep 1
        done
        ;;
    *) echo "Usage: $0 {start|reload|check_ip|harden|relax|cache_stats|cache_list|cache_clear|status|monitor}" ;;
esac
EOF
    chmod +x /usr/bin/orasrs-client
}

# 5. 安装 Node.js 客户端 (Hybrid/Full)
install_node_client() {
    print_step "下载并安装 Node.js 客户端..."
    
    mkdir -p /usr/lib/orasrs
    mkdir -p /var/lib/orasrs
    
    # 下载 orasrs-lite.js
    CLIENT_URL="${REPO_URL}/openwrt/orasrs-client/orasrs-lite.js"
    print_info "Downloading from $CLIENT_URL"
    curl -fsSL "$CLIENT_URL" -o /usr/lib/orasrs/orasrs-lite.js
    
    # 下载 client-onboarding.js (用于初始化)
    ONBOARDING_URL="${REPO_URL}/client-onboarding.js"
    print_info "Downloading onboarding script from $ONBOARDING_URL"
    curl -fsSL "$ONBOARDING_URL" -o /usr/lib/orasrs/client-onboarding.js

    if [ ! -s /usr/lib/orasrs/orasrs-lite.js ]; then
        print_error "下载失败，请检查网络连接"
        exit 1
    fi
    
    chmod +x /usr/lib/orasrs/orasrs-lite.js
    
    # 创建 package.json (关键：启用 ESM 支持)
    cat > /usr/lib/orasrs/package.json << 'EOF'
{
  "name": "orasrs-lite",
  "version": "3.3.6",
  "description": "OraSRS Lite Client",
  "main": "orasrs-lite.js",
  "type": "module"
}
EOF
    
    print_info "Node.js 客户端已安装 (使用 SQLite3 CLI 适配器)"
    
    # 创建 CLI 包装器
    cat > /usr/bin/orasrs-client << 'EOF'
#!/bin/sh
# OraSRS Client Wrapper
node /usr/lib/orasrs/orasrs-lite.js "$@"
EOF
    chmod +x /usr/bin/orasrs-client
    
    # 创建 CLI 工具
    cat > /usr/bin/orasrs-cli << 'EOF'
#!/bin/sh
# OraSRS CLI Tool
API_URL="http://localhost:3006"

case "$1" in
    init)
        echo "Starting initialization..."
        cd /usr/lib/orasrs && node client-onboarding.js
        ;;
    query)
        curl -s "$API_URL/query?ip=$2"
        echo ""
        ;;
    sync)
        curl -X POST "$API_URL/sync"
        echo ""
        ;;
    status)
        curl -s "$API_URL/health"
        echo ""
        ;;
    stats)
        curl -s "$API_URL/stats"
        echo ""
        ;;
    cache)
        if [ "$2" = "stats" ]; then
            sqlite3 /var/lib/orasrs/cache.db "SELECT COUNT(*) FROM threats"
        elif [ "$2" = "list" ]; then
            sqlite3 /var/lib/orasrs/cache.db "SELECT * FROM threats LIMIT 10"
        elif [ "$2" = "clear" ]; then
             sqlite3 /var/lib/orasrs/cache.db "DELETE FROM threats"
             echo "Cache cleared"
        fi
        ;;
    monitor)
        watch -n 1 "curl -s $API_URL/stats"
        ;;
    *)
        echo "Usage: orasrs-cli {query|sync|status|stats|cache|monitor}"
        ;;
esac
EOF
    chmod +x /usr/bin/orasrs-cli
}

# 6. 生成 LuCI 界面
generate_luci() {
    print_step "生成 LuCI 管理界面..."
    
    # 1. Controller
    mkdir -p /usr/lib/lua/luci/controller
    cat > /usr/lib/lua/luci/controller/orasrs.lua << 'EOF'
module("luci.controller.orasrs", package.seeall)

function index()
    entry({"admin", "services", "orasrs"}, cbi("orasrs"), _("OraSRS Threat Defense"), 100).dependent = true
end
EOF

    # 2. Model (CBI)
    mkdir -p /usr/lib/lua/luci/model/cbi
    cat > /usr/lib/lua/luci/model/cbi/orasrs.lua << 'EOF'
m = Map("orasrs", translate("OraSRS Threat Defense"), translate("Decentralized threat signaling and DDoS protection."))

s = m:section(TypedSection, "main", translate("Global Settings"))
s.anonymous = true

-- Enable
o = s:option(Flag, "enabled", translate("Enable Protection"))

-- Status Display
status = s:option(DummyValue, "_status", translate("Current Status"))
status.value = "Running"

-- Mode Selection
mode = s:option(ListValue, "mode", translate("Operation Mode"))
mode:value("edge", "Edge (Low RAM)")
mode:value("hybrid", "Hybrid (Node.js)")
mode:value("full", "Full (Node.js)")
mode.default = "edge"

-- Config
limit_rate = s:option(Value, "limit_rate", translate("SYN Rate Limit"))
limit_rate.default = "20/s"

limit_burst = s:option(Value, "limit_burst", translate("SYN Burst Limit"))
limit_burst.default = "50"

sync_interval = s:option(Value, "sync_interval", translate("Sync Interval (s)"))
sync_interval.default = "3600"

return m
EOF

    # 3. 刷新 LuCI 缓存
    rm -f /tmp/luci-indexcache
    print_info "LuCI 界面已安装: Services -> OraSRS Threat Defense"
}

# 7. 安装主逻辑
install_orasrs() {
    print_step "安装 OraSRS 客户端 ($INSTALL_MODE 模式)..."
    
    if [ "$INSTALL_MODE" = "edge" ]; then
        generate_edge_client
        # Edge 模式使用简单的 CLI
        cat > /usr/bin/orasrs-cli << 'EOF'
#!/bin/sh
/usr/bin/orasrs-client "$@"
EOF
        chmod +x /usr/bin/orasrs-cli
        
    elif [ "$INSTALL_MODE" = "hybrid" ] || [ "$INSTALL_MODE" = "full" ]; then
        install_node_client
    fi
    
    # 生成配置文件
    mkdir -p /etc/config
    cat > /etc/config/orasrs << EOF
config orasrs 'main'
    option enabled '1'
    option mode '$INSTALL_MODE'
    option sync_interval '3600'
    option limit_rate '20/s'
    option limit_burst '50'
    # T3 配置
    option blockchain_endpoints 'https://api.orasrs.net http://127.0.0.1:8545'
    option offline_mode 'auto'
    option cache_size '1000'
EOF

    # 生成 Init 脚本
    cat > /etc/init.d/orasrs << 'EOF'
#!/bin/sh /etc/rc.common
START=99
USE_PROCD=1

start_service() {
    procd_open_instance
    # 根据模式选择启动命令
    MODE=$(uci get orasrs.main.mode 2>/dev/null)
    if [ "$MODE" = "edge" ]; then
        procd_set_param command /usr/bin/orasrs-client start
    else
        procd_set_param command node /usr/lib/orasrs/orasrs-lite.js
    fi
    
    procd_set_param respawn ${respawn_threshold:-3600} ${respawn_timeout:-5} ${respawn_retry:-5}
    procd_set_param stdout 1
    procd_set_param stderr 1
    procd_set_param file /etc/config/orasrs
    procd_close_instance
}

reload_service() {
    /etc/init.d/orasrs restart
}

service_triggers() {
    procd_add_reload_trigger "orasrs"
}
EOF
    chmod +x /etc/init.d/orasrs

    # 生成防火墙 Hotplug 脚本
    mkdir -p /etc/hotplug.d/firewall
    cat > /etc/hotplug.d/firewall/99-orasrs << 'EOF'
#!/bin/sh
[ "$ACTION" = "reload" ] || [ "$ACTION" = "start" ] || exit 0
/etc/init.d/orasrs restart
EOF
    chmod +x /etc/hotplug.d/firewall/99-orasrs
    
    # 生成 /etc/firewall.user (OpenWrt 防火墙自动加载)
    print_step "生成 /etc/firewall.user 防火墙规则..."
    cat > /etc/firewall.user << 'FWEOF'
#!/bin/sh
# =======================================================================================
# OraSRS OpenWrt Firewall Rules - Complete Ruleset v4.0.1
# =======================================================================================

# 模块加载
modprobe ip_set 2>/dev/null
modprobe ip_set_hash_net 2>/dev/null
modprobe xt_set 2>/dev/null
modprobe xt_limit 2>/dev/null
modprobe xt_conntrack 2>/dev/null

# 配置参数
LIMIT_RATE=$(uci get orasrs.main.limit_rate 2>/dev/null || echo "20/s")
LIMIT_BURST=$(uci get orasrs.main.limit_burst 2>/dev/null || echo "50")
SSH_PORT=$(uci get dropbear.@dropbear[0].Port 2>/dev/null || echo "22")
IPSET_NAME="orasrs_threats"

# IPSet 初始化
ipset create $IPSET_NAME hash:net family inet hashsize 4096 maxelem 65536 -exist 2>/dev/null

# 清理旧规则
iptables -D INPUT -j orasrs_chain 2>/dev/null
iptables -D FORWARD -j orasrs_chain 2>/dev/null
iptables -F orasrs_chain 2>/dev/null
iptables -X orasrs_chain 2>/dev/null

# 创建自定义链
iptables -N orasrs_chain

# 1. 本地回环
iptables -A orasrs_chain -i lo -j ACCEPT

# 2. 连接跟踪
iptables -A orasrs_chain -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A orasrs_chain -m conntrack --ctstate INVALID -j DROP

# 3. 威胁情报拦截 (T3)
iptables -A orasrs_chain -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null

# 4. SSH 保护
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -m recent --name SSH --set
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -m recent --name SSH --update --seconds 60 --hitcount 4 -j DROP
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -j ACCEPT

# 5. SYN Flood 防护 (T0)
iptables -A orasrs_chain -p tcp --syn -m limit --limit $LIMIT_RATE --limit-burst $LIMIT_BURST -j ACCEPT
iptables -A orasrs_chain -p tcp --syn -j DROP

# 应用规则
iptables -I INPUT 1 -j orasrs_chain

logger -t ORASRS "Firewall rules loaded successfully"
FWEOF
    chmod +x /etc/firewall.user
    print_info "/etc/firewall.user 已生成"
    
    # 安装 LuCI
    if [ "$INSTALL_LUCI" -eq 1 ]; then
        generate_luci
    fi
    
    # 启动服务
    /etc/init.d/orasrs enable
    /etc/init.d/orasrs start
}

# 主函数
main() {
    echo "========================================="
    echo "  OraSRS OpenWrt 智能安装程序 v3.3.6"
    echo "========================================="
    
    check_environment
    select_mode "$1"
    install_dependencies
    install_orasrs
    
    echo ""
    echo "========================================="
    MODE_UPPER=$(echo "$INSTALL_MODE" | tr 'a-z' 'A-Z')
    echo "  安装完成! 模式: ${MODE_UPPER}"
    echo "  验证: orasrs-cli status"
    if [ "$INSTALL_LUCI" -eq 1 ]; then
        echo "  界面: Services -> OraSRS"
    fi
    echo "========================================="
}

main "$@"
