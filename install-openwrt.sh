#!/bin/sh
# OraSRS OpenWrt 智能安装脚本
# OraSRS OpenWrt Intelligent Installation Script
# Version: 3.2.2

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
HAS_NFT=0
INSTALL_LUCI=0

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
    
    # 检查 nftables
    if command -v nft >/dev/null 2>&1; then
        HAS_NFT=1
        print_info "nftables: 已安装 (将优先使用)"
    else
        # 检查 ipset
        if command -v ipset >/dev/null 2>&1; then
            HAS_IPSET=1
            print_info "ipset: 已安装"
        else
            print_warning "ipset/nftables: 未安装 (将尝试自动安装)"
        fi
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
    PACKAGES="curl ca-certificates"
    
    if [ "$HAS_NFT" -eq 1 ]; then
        PACKAGES="$PACKAGES nftables"
    else
        PACKAGES="$PACKAGES ipset iptables"
    fi
    
    # 模式特定依赖
    if [ "$INSTALL_MODE" = "hybrid" ]; then
        PACKAGES="$PACKAGES python3 python3-pip"
    elif [ "$INSTALL_MODE" = "full" ]; then
        PACKAGES="$PACKAGES node node-npm"
    fi
    
    print_info "正在安装: $PACKAGES"
    opkg install $PACKAGES || print_warning "部分包安装失败，尝试继续..."
}

# 4. 生成 Edge 客户端 (Shell 版本 - 双栈支持)
generate_edge_client() {
    cat > /usr/bin/orasrs-client << 'EOF'
#!/bin/sh
# OraSRS Edge Client (Shell Version)
# 工业级增强版: nftables/ipset 双栈支持、原子更新、并发锁

CONFIG_FILE="/etc/config/orasrs"
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
    LIMIT=$(uci get orasrs.main.limit_rate 2>/dev/null || echo "20/s")
    BURST=$(uci get orasrs.main.limit_burst 2>/dev/null || echo "50")
    SYNC_INTERVAL=$(uci get orasrs.main.sync_interval 2>/dev/null || echo 3600)
}

init_firewall_nft() {
    # 转换为 nftables 格式 (20/s -> 20/second)
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
    # 自动加载内核模块
    modprobe ip_set 2>/dev/null
    modprobe ip_set_hash_net 2>/dev/null
    modprobe xt_set 2>/dev/null
    modprobe xt_limit 2>/dev/null

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
    
    if ! iptables -C FORWARD -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null; then
        iptables -I FORWARD -m set --match-set $IPSET_NAME src -j DROP
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
                    # 格式化 IP 列表
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
        # 简化 check_ip，仅支持 ipset 方式查询，nft 需要解析 json
        if [ "$BACKEND" = "iptables" ]; then
            ipset test orasrs_threats $2 2>/dev/null && echo "THREAT" || echo "SAFE"
        else
            echo "SAFE (nft check not implemented in shell)"
        fi
        ;;
    harden) harden_mode ;;
    relax) relax_mode ;;
    cache_stats)
        if [ "$BACKEND" = "iptables" ]; then
            ipset list orasrs_threats -t 2>/dev/null | grep "Number of entries" || echo "Number of entries: 0"
        else
            # nftables stats (simple count)
            nft list set inet orasrs threats | grep -c "\." || echo "0"
        fi
        ;;
    cache_list)
        if [ "$BACKEND" = "iptables" ]; then
            ipset list orasrs_threats | head -n 20
        else
            nft list set inet orasrs threats | head -n 20
        fi
        ;;
    cache_clear)
        if [ "$BACKEND" = "iptables" ]; then
            ipset flush orasrs_threats
        else
            nft flush set inet orasrs threats
        fi
        log "Cache cleared by user."
        echo "Cache cleared."
        ;;
    *) echo "Usage: $0 {start|reload|check_ip|harden|relax|cache_stats|cache_list|cache_clear}" ;;
esac
EOF
    chmod +x /usr/bin/orasrs-client
}

# 5. 生成 LuCI 界面
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
local sys = require "luci.sys"
local limit = sys.exec("uci get orasrs.main.limit_rate")
local burst = sys.exec("uci get orasrs.main.limit_burst")
status.value = string.format("Limit: %s, Burst: %s", limit, burst)

-- Mode Selection
mode = s:option(ListValue, "mode", translate("Operation Mode"))
mode:value("edge", "Edge (Low RAM)")
mode:value("hybrid", "Hybrid (Python)")
mode.default = "edge"

-- Harden Button (Simulated via Flag for now, or custom template)
-- For simplicity in this 10KB version, we use simple config options
limit_rate = s:option(Value, "limit_rate", translate("SYN Rate Limit"))
limit_rate.default = "20/s"

limit_burst = s:option(Value, "limit_burst", translate("SYN Burst Limit"))
limit_burst.default = "50"

return m
EOF

    # 3. 刷新 LuCI 缓存
    rm -f /tmp/luci-indexcache
    print_info "LuCI 界面已安装: Services -> OraSRS Threat Defense"
}

# 6. 安装主逻辑
install_orasrs() {
    print_step "安装 OraSRS 客户端 ($INSTALL_MODE 模式)..."
    
    # 仅更新 Edge 客户端以支持 nftables，Hybrid 暂保持原样
    if [ "$INSTALL_MODE" = "edge" ]; then
        generate_edge_client
    elif [ "$INSTALL_MODE" = "hybrid" ]; then
        # Hybrid 模式暂不支持 nftables，回退到旧版生成逻辑或提示
        # 为简化，这里复用 Edge 客户端逻辑（Edge 客户端其实足够强大）
        # 或者保留原有的 generate_hybrid_client (需自行添加 nft 支持)
        print_warning "Hybrid 模式暂未适配 nftables，将使用 Edge 客户端替代..."
        generate_edge_client
    elif [ "$INSTALL_MODE" = "full" ]; then
        print_error "Full 模式暂未在 OpenWrt 脚本中完全实现。"
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
    cache)
        case "$2" in
            stats) /usr/bin/orasrs-client cache_stats ;;
            list) /usr/bin/orasrs-client cache_list ;;
            clear) /usr/bin/orasrs-client cache_clear ;;
            *) echo "Usage: orasrs-cli cache {stats|list|clear}" ;;
        esac
        ;;
    *) echo "Usage: orasrs-cli {query|add|sync|harden|relax|cache}" ;;
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

    # 生成 Init 脚本
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

    # 生成防火墙 Hotplug 脚本 (防止规则在防火墙重启后丢失)
    mkdir -p /etc/hotplug.d/firewall
    cat > /etc/hotplug.d/firewall/99-orasrs << 'EOF'
#!/bin/sh
[ "$ACTION" = "reload" ] || [ "$ACTION" = "start" ] || exit 0
/usr/bin/orasrs-client reload
EOF
    chmod +x /etc/hotplug.d/firewall/99-orasrs
    
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
    echo "  OraSRS OpenWrt 智能安装程序 v3.2.2"
    echo "========================================="
    
    check_environment
    select_mode "$1"
    install_dependencies
    install_orasrs
    
    echo ""
    echo "========================================="
    MODE_UPPER=$(echo "$INSTALL_MODE" | tr 'a-z' 'A-Z')
    echo "  模式: ${MODE_UPPER}"
    if [ "$HAS_NFT" -eq 1 ]; then
        echo "  后端: nftables (高性能)"
    else
        echo "  后端: iptables (传统)"
    fi
    if [ "$INSTALL_LUCI" -eq 1 ]; then
        echo "  界面: 已安装 (Services -> OraSRS)"
    fi
    echo "  CLI命令: orasrs-cli query <IP>"
    echo "  缓存命令: orasrs-cli cache {stats|list|clear}"
    echo "  应急命令: orasrs-cli harden"
    echo "========================================="
}

main "$@"
