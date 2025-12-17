#!/bin/sh
# =======================================================================================
# OraSRS Emergency Defense Activation
# 紧急防御激活脚本 - 立即启用 SYN Flood 防护
# =======================================================================================
# Version: 4.0.0
# Purpose: Immediate DDoS protection deployment for emergency situations
# =======================================================================================

echo "=== OraSRS Emergency Defense ==="
echo "正在激活防护规则..."
echo ""

# ===========================
# 模块加载 (Kernel Modules)
# ===========================
echo "[1/5] 加载内核模块..."
modprobe ip_set 2>/dev/null
modprobe ip_set_hash_net 2>/dev/null
modprobe xt_set 2>/dev/null
modprobe xt_limit 2>/dev/null
modprobe xt_conntrack 2>/dev/null
modprobe xt_recent 2>/dev/null

# ===========================
# 配置参数 (Configuration)
# ===========================
echo "[2/5] 读取配置参数..."
LIMIT_RATE=$(uci get orasrs.main.limit_rate 2>/dev/null || echo "20/s")
LIMIT_BURST=$(uci get orasrs.main.limit_burst 2>/dev/null || echo "50")
SSH_PORT=$(uci get dropbear.@dropbear[0].Port 2>/dev/null || grep "^Port" /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}')
SSH_PORT=${SSH_PORT:-22}
IPSET_NAME="orasrs_threats"

echo "  - SYN Limit: $LIMIT_RATE (Burst: $LIMIT_BURST)"
echo "  - SSH Port: $SSH_PORT"

# ===========================
# IPSet 初始化
# ===========================
echo "[3/5] 初始化 IPSet..."
ipset create $IPSET_NAME hash:net family inet hashsize 4096 maxelem 65536 -exist 2>/dev/null

# ===========================
# 清理旧规则 (Cleanup)
# ===========================
echo "[4/5] 清理旧规则..."
iptables -D INPUT -j orasrs_chain 2>/dev/null
iptables -D FORWARD -j orasrs_chain 2>/dev/null
iptables -F orasrs_chain 2>/dev/null
iptables -X orasrs_chain 2>/dev/null

# ===========================
# 创建自定义链 (Custom Chain)
# ===========================
echo "[5/5] 部署防护规则..."
iptables -N orasrs_chain

# =======================================================================================
# 核心规则 (Core Rules) - 按优先级排序
# =======================================================================================

# 1️⃣ 本地回环保护
iptables -A orasrs_chain -i lo -j ACCEPT

# 2️⃣ 连接状态跟踪
iptables -A orasrs_chain -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A orasrs_chain -m conntrack --ctstate INVALID -j DROP

# 3️⃣ 威胁情报拦截 (零容忍 - 必须在 SSH/SYN 防护之前)
iptables -A orasrs_chain -m set --match-set $IPSET_NAME src -j DROP 2>/dev/null

# 4️⃣ SSH 保护 (三重保障)
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -m recent --name SSH --set
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -m recent --name SSH --update --seconds 60 --hitcount 4 -j DROP
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -m conntrack --ctstate NEW -j ACCEPT

# 5️⃣ SYN Flood 防护
iptables -A orasrs_chain -p tcp --syn -m limit --limit $LIMIT_RATE --limit-burst $LIMIT_BURST -j ACCEPT
iptables -A orasrs_chain -p tcp --syn -j DROP

# 6️⃣ ICMP 洪水防护
iptables -A orasrs_chain -p icmp --icmp-type echo-request -m limit --limit 5/s --limit-burst 10 -j ACCEPT
iptables -A orasrs_chain -p icmp --icmp-type echo-request -j DROP
iptables -A orasrs_chain -p icmp --icmp-type destination-unreachable -j ACCEPT
iptables -A orasrs_chain -p icmp --icmp-type time-exceeded -j ACCEPT

# 7️⃣ 日志记录 (低频率)
iptables -A orasrs_chain -m limit --limit 1/min --limit-burst 3 -j LOG --log-prefix "ORASRS-EMERGENCY: " --log-level 4

# =======================================================================================
# 应用规则 (Apply Rules)
# =======================================================================================
iptables -I INPUT 1 -j orasrs_chain

# =======================================================================================
# 日志记录 (System Log)
# =======================================================================================
logger -t ORASRS "EMERGENCY defense activated | Limit: $LIMIT_RATE | Burst: $LIMIT_BURST | SSH: $SSH_PORT"

echo ""
echo "✅ 防护规则已激活！"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 验证规则:"
echo "  iptables -nvL orasrs_chain"
echo ""
echo "📈 实时监控:"
echo "  watch -n1 'iptables -nvL orasrs_chain | head -20'"
echo ""
echo "📝 查看日志:"
echo "  logread | grep ORASRS"
echo "  logread -f | grep ORASRS  # 实时跟踪"
echo ""
echo "⚙️  调整参数 (如果需要更严格的限制):"
echo "  uci set orasrs.main.limit_rate='5/s'"
echo "  uci set orasrs.main.limit_burst='10'"
echo "  uci commit orasrs"
echo "  /etc/firewall.user  # 重新加载"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
