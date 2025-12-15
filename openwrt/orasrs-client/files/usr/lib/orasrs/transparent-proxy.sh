#!/bin/sh
# OraSRS Transparent Proxy - Traffic Interception and Threat Blocking
# Supports both iptables and nftables

ORASRS_PORT=3006
ORASRS_CHAIN="ORASRS_FILTER"
CONFIG_FILE="/etc/config/orasrs"

# Load configuration
load_config() {
    . /lib/functions.sh
    config_load orasrs
    
    config_get IOT_SHIELD_ENABLED iot_shield enabled 0
    config_get SHIELD_MODE iot_shield shield_mode "monitor"
    config_get IOT_NETWORK iot_shield iot_network "192.168.2.0/24"
    config_get PROTECTED_PORTS iot_shield protected_ports "80 443 1883 8883"
    config_get BLOCK_THRESHOLD iot_shield block_threshold 80
}

setup_ipsets() {
    # 创建 ipset 用于白名单和黑名单
    ipset create orasrs-whitelist hash:net family inet hashsize 1024 maxelem 10000 -exist
    ipset create orasrs-blacklist hash:net family inet hashsize 1024 maxelem 10000 timeout 86400 -exist
    
    # 添加本地网络到白名单
    ipset add orasrs-whitelist 127.0.0.0/8 -exist
    ipset add orasrs-whitelist 10.0.0.0/8 -exist
    ipset add orasrs-whitelist 172.16.0.0/12 -exist
    ipset add orasrs-whitelist 192.168.0.0/16 -exist
}

setup_iptables_transparent_proxy() {
    logger -t orasrs "Setting up transparent proxy with iptables"
    
    # 创建自定义链
    iptables -t nat -N $ORASRS_CHAIN 2>/dev/null
    iptables -t filter -N $ORASRS_CHAIN 2>/dev/null
    iptables -t mangle -N $ORASRS_CHAIN 2>/dev/null
    
    # 清空现有规则
    iptables -t nat -F $ORASRS_CHAIN
    iptables -t filter -F $ORASRS_CHAIN
    iptables -t mangle -F $ORASRS_CHAIN
    
    # 白名单直接放行（在 NAT 表中）
    iptables -t nat -A $ORASRS_CHAIN -m set --match-set orasrs-whitelist src -j RETURN
    iptables -t nat -A $ORASRS_CHAIN -m set --match-set orasrs-whitelist dst -j RETURN
    
    # 黑名单直接拒绝（在 FILTER 表中）
    iptables -t filter -A $ORASRS_CHAIN -m set --match-set orasrs-blacklist src -j REJECT --reject-with icmp-admin-prohibited
    iptables -t filter -A $ORASRS_CHAIN -m set --match-set orasrs-blacklist dst -j REJECT --reject-with icmp-admin-prohibited
    
    if [ "$SHIELD_MODE" = "block" ]; then
        # 仅拦截来自 IoT 网段的流量
        # 转换端口列表为 multiport 格式
        PORTS=$(echo $PROTECTED_PORTS | tr ' ' ',')
        
        # 标记需要检查的连接
        iptables -t mangle -A PREROUTING -s $IOT_NETWORK \
            -p tcp -m multiport --dports $PORTS \
            -m set ! --match-set orasrs-whitelist dst \
            -j MARK --set-mark 0x1
        
        # 使用 TPROXY 透明代理（需要内核支持）
        # 或者使用 REDIRECT（更通用）
        if iptables -t mangle -A PREROUTING -p tcp -m mark --mark 0x1 \
            -j TPROXY --on-port $ORASRS_PORT --tproxy-mark 0x1 2>/dev/null; then
            logger -t orasrs "Using TPROXY mode"
            
            # 配置路由表
            ip rule add fwmark 0x1 table 100 2>/dev/null
            ip route add local 0.0.0.0/0 dev lo table 100 2>/dev/null
        else
            logger -t orasrs "TPROXY not available, using REDIRECT"
            
            # 降级到 REDIRECT 模式
            iptables -t nat -A PREROUTING -s $IOT_NETWORK \
                -p tcp -m multiport --dports $PORTS \
                -m set ! --match-set orasrs-whitelist dst \
                -j REDIRECT --to-ports $ORASRS_PORT
        fi
        
        logger -t orasrs "Transparent proxy enabled for $IOT_NETWORK on ports $PORTS"
    else
        logger -t orasrs "Monitor mode enabled - traffic will be logged only"
    fi
    
    # 在 FORWARD 链检查黑名单
    iptables -t filter -I FORWARD 1 -j $ORASRS_CHAIN
    
    # 日志记录（可选）
    if [ "$SHIELD_MODE" = "monitor" ]; then
        iptables -t filter -A $ORASRS_CHAIN -s $IOT_NETWORK \
            -m limit --limit 10/min \
            -j LOG --log-prefix "OraSRS-Monitor: " --log-level 6
    fi
}

setup_nft_transparent_proxy() {
    # nftables 版本（用于 OpnSense 等）
    logger -t orasrs "Setting up transparent proxy with nftables"
    
    nft add table inet orasrs 2>/dev/null
    nft flush table inet orasrs
    
    # 创建 sets
    nft add set inet orasrs whitelist { type ipv4_addr\; flags interval\; }
    nft add set inet orasrs blacklist { type ipv4_addr\; flags interval\; timeout 24h\; }
    
    # 添加白名单
    nft add element inet orasrs whitelist { 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 }
    
    # 创建链
    nft add chain inet orasrs prerouting { type filter hook prerouting priority -150\; }
    nft add chain inet orasrs forward { type filter hook forward priority 0\; }
    
    # 规则
    nft add rule inet orasrs prerouting ip saddr @whitelist accept
    nft add rule inet orasrs prerouting ip daddr @whitelist accept
    nft add rule inet orasrs forward ip saddr @blacklist reject
    nft add rule inet orasrs forward ip daddr @blacklist reject
    
    if [ "$SHIELD_MODE" = "block" ]; then
        PORTS=$(echo $PROTECTED_PORTS | tr ' ' ',')
        nft add rule inet orasrs prerouting ip saddr $IOT_NETWORK \
            tcp dport { $PORTS } ip daddr != @whitelist \
            redirect to :$ORASRS_PORT
        
        logger -t orasrs "nftables transparent proxy enabled"
    fi
}

cleanup_iptables() {
    logger -t orasrs "Cleaning up iptables rules"
    
    # 从主链移除
    iptables -t nat -D PREROUTING -j $ORASRS_CHAIN 2>/dev/null
    iptables -t filter -D FORWARD -j $ORASRS_CHAIN 2>/dev/null
    iptables -t mangle -D PREROUTING -j $ORASRS_CHAIN 2>/dev/null
    
    # 清空并删除自定义链
    iptables -t nat -F $ORASRS_CHAIN 2>/dev/null
    iptables -t nat -X $ORASRS_CHAIN 2>/dev/null
    iptables -t filter -F $ORASRS_CHAIN 2>/dev/null
    iptables -t filter -X $ORASRS_CHAIN 2>/dev/null
    iptables -t mangle -F $ORASRS_CHAIN 2>/dev/null
    iptables -t mangle -X $ORASRS_CHAIN 2>/dev/null
    
    # 清理路由规则
    ip rule del fwmark 0x1 table 100 2>/dev/null
    ip route del local 0.0.0.0/0 dev lo table 100 2>/dev/null
    
    # 删除 ipset
    ipset destroy orasrs-whitelist 2>/dev/null
    ipset destroy orasrs-blacklist 2>/dev/null
}

cleanup_nft() {
    logger -t orasrs "Cleaning up nftables rules"
    nft delete table inet orasrs 2>/dev/null
}

start() {
    load_config
    
    if [ "$IOT_SHIELD_ENABLED" != "1" ]; then
        logger -t orasrs "IoT Shield is disabled"
        return 0
    fi
    
    # 设置 ipsets
    setup_ipsets
    
    # 检测使用 iptables 还是 nftables
    if command -v nft >/dev/null 2>&1 && [ -f /etc/nftables.conf ]; then
        setup_nft_transparent_proxy
    else
        setup_iptables_transparent_proxy
    fi
    
    logger -t orasrs "Transparent proxy started in $SHIELD_MODE mode"
}

stop() {
    logger -t orasrs "Stopping transparent proxy"
    
    cleanup_iptables
    cleanup_nft
    
    logger -t orasrs "Transparent proxy stopped"
}

restart() {
    stop
    sleep 1
    start
}

status() {
    load_config
    
    echo "OraSRS Transparent Proxy Status"
    echo "================================"
    echo "IoT Shield Enabled: $IOT_SHIELD_ENABLED"
    echo "Mode: $SHIELD_MODE"
    echo "IoT Network: $IOT_NETWORK"
    echo "Protected Ports: $PROTECTED_PORTS"
    echo ""
    
    echo "IPSet Statistics:"
    ipset list orasrs-whitelist -t 2>/dev/null | head -n 10
    ipset list orasrs-blacklist -t 2>/dev/null | head -n 10
    echo ""
    
    echo "IPTables Rules:"
    iptables -t nat -L $ORASRS_CHAIN -n -v 2>/dev/null
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac

exit 0
