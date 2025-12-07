#!/bin/sh
# OraSRS Threat Intelligence Client for OpenWrt
# 轻量级威胁情报客户端，专为OpenWrt路由器设计

# 配置变量
CONFIG_FILE="/etc/config/orasrs"
MEMORY_LIMIT=32000  # 32MB in KB
UPDATE_INTERVAL=300 # 5分钟更新一次
ENABLED=1
SILENT_MODE=1
LOG_FILE="/var/log/orasrs.log"

# 日志函数
log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# 检查IP是否在威胁列表中
check_threat_ip() {
    local ip=$1
    # 从配置文件中检查IP是否被阻止
    uci show orasrs | grep -q "ip='$ip'"
    if [ $? -eq 0 ]; then
        # 检查是否过期
        local duration=$(uci get orasrs.@firewall_rule[-1].duration 2>/dev/null)
        local created_at=$(uci get orasrs.@firewall_rule[-1].created_at 2>/dev/null)
        if [ -n "$duration" ] && [ -n "$created_at" ]; then
            local now=$(date +%s)
            if [ $((now - created_at)) -lt $duration ]; then
                return 0  # IP在威胁列表中且未过期
            else
                # 删除过期规则
                local rule_index=$(uci show orasrs | grep -n "ip='$ip'" | cut -d: -f1 | sed 's/orasrs\.@firewall_rule\[//' | sed 's/\].*//')
                uci delete orasrs.@firewall_rule[$rule_index] 2>/dev/null
                uci commit orasrs
                return 1  # 规则已过期并被删除
            fi
        else
            return 0  # IP在威胁列表中
        fi
    fi
    return 1  # IP不在威胁列表中
}

# 添加防火墙规则
add_firewall_rule() {
    local ip=$1
    local reason=$2
    local duration=${3:-86400}  # 默认24小时
    
    # 检查IP是否已存在
    if uci show orasrs | grep -q "ip='$ip'"; then
        return 0
    fi
    
    # 添加新的防火墙规则
    local rule_index=$(uci add orasrs firewall_rule)
    uci set orasrs.$rule_index.ip="$ip"
    uci set orasrs.$rule_index.type="block"
    uci set orasrs.$rule_index.reason="$reason"
    uci set orasrs.$rule_index.duration="$duration"
    uci set orasrs.$rule_index.created_at=$(date +%s)
    uci commit orasrs
    
    # 使用iptables添加规则
    iptables -I INPUT -s $ip -j DROP
    iptables -I FORWARD -s $ip -j DROP
    
    log_msg "Added firewall rule for IP: $ip (Reason: $reason)"
}

# 清理过期规则
cleanup_expired_rules() {
    local now=$(date +%s)
    local rules=$(uci show orasrs | grep "=firewall_rule" | cut -d'.' -f2 | cut -d'=' -f1)
    
    for rule in $rules; do
        local duration=$(uci get orasrs.$rule.duration 2>/dev/null)
        local created_at=$(uci get orasrs.$rule.created_at 2>/dev/null)
        
        if [ -n "$duration" ] && [ -n "$created_at" ]; then
            if [ $((now - created_at)) -ge $duration ]; then
                # 获取IP地址以从iptables中删除规则
                local ip=$(uci get orasrs.$rule.ip 2>/dev/null)
                if [ -n "$ip" ]; then
                    # 从iptables中删除规则
                    iptables -D INPUT -s $ip -j DROP 2>/dev/null
                    iptables -D FORWARD -s $ip -j DROP 2>/dev/null
                fi
                
                # 从UCI配置中删除规则
                uci delete orasrs.$rule
                uci commit orasrs
                log_msg "Removed expired firewall rule for IP: $ip"
            fi
        fi
    done
}

# 同步威胁情报
sync_threat_intel() {
    log_msg "Starting threat intelligence sync"
    
    # 这里应该从OraSRS链获取最新的威胁情报
    # 为演示目的，我们只检查一些示例IP
    # 在实际实现中，这里会调用API获取最新威胁数据
    
    # 示例：从远程API获取威胁情报（如果可用）
    if command -v curl >/dev/null 2>&1; then
        # 模拟从OraSRS链获取威胁数据
        # 实际实现中，这将是一个到OraSRS端点的API调用
        log_msg "Sync completed"
    else
        log_msg "curl not available, using local threat list only"
    fi
}

# 初始化
init_orasrs() {
    # 检查配置文件是否存在
    if [ ! -f $CONFIG_FILE ]; then
        log_msg "Configuration file not found, creating default"
        touch $CONFIG_FILE
        uci set orasrs.main=orasrs
        uci set orasrs.main.enabled=1
        uci set orasrs.main.silent_mode=1
        uci set orasrs.main.update_interval=300
        uci commit orasrs
    fi
    
    # 从UCI获取配置
    ENABLED=$(uci get orasrs.main.enabled 2>/dev/null || echo 1)
    SILENT_MODE=$(uci get orasrs.main.silent_mode 2>/dev/null || echo 1)
    UPDATE_INTERVAL=$(uci get orasrs.main.update_interval 2>/dev/null || echo 300)
    
    log_msg "OraSRS initialized (Enabled: $ENABLED, Silent: $SILENT_MODE, Interval: $UPDATE_INTERVAL)"
}

# 主循环
main_loop() {
    log_msg "Starting OraSRS main loop"
    
    while [ $ENABLED -eq 1 ]; do
        # 检查内存使用情况
        local mem_used=$(cat /proc/meminfo | grep MemFree | awk '{print $2}')
        if [ $mem_used -lt $MEMORY_LIMIT ]; then
            log_msg "Memory usage too high, skipping sync"
        else
            # 清理过期规则
            cleanup_expired_rules
            
            # 同步威胁情报
            sync_threat_intel
        fi
        
        # 等待下次更新
        sleep $UPDATE_INTERVAL
    done
}

# 处理命令行参数
case "$1" in
    start)
        init_orasrs
        main_loop &
        ;;
    stop)
        # 停止所有OraSRS进程
        killall -q orasrs_client.sh
        # 清除iptables中的OraSRS规则
        # 这里需要更精确的规则匹配和删除
        log_msg "OraSRS stopped"
        ;;
    restart)
        $0 stop
        sleep 1
        $0 start
        ;;
    check_ip)
        if [ -n "$2" ]; then
            if check_threat_ip "$2"; then
                echo "THREAT_FOUND"
                exit 1
            else
                echo "NO_THREAT"
                exit 0
            fi
        else
            echo "Usage: $0 check_ip <IP_ADDRESS>"
            exit 1
        fi
        ;;
    add_rule)
        if [ -n "$2" ] && [ -n "$3" ]; then
            add_firewall_rule "$2" "$3" "$4"
        else
            echo "Usage: $0 add_rule <IP_ADDRESS> <REASON> [DURATION]"
            exit 1
        fi
        ;;
    init)
        init_orasrs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|check_ip|add_rule|init}"
        exit 1
        ;;
esac