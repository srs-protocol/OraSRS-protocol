#!/bin/sh
# OraSRS Emergency Defense Activation
# 紧急防御激活脚本 - 立即启用 SYN Flood 防护

echo "=== OraSRS Emergency Defense ==="
echo "正在激活防护规则..."

# 加载内核模块
modprobe ip_set 2>/dev/null
modprobe ip_set_hash_net 2>/dev/null
modprobe xt_set 2>/dev/null
modprobe xt_limit 2>/dev/null
modprobe xt_conntrack 2>/dev/null

# 创建 ipset
IPSET_NAME="orasrs_threats"
ipset create $IPSET_NAME hash:net -exist 2>/dev/null

# 获取 SSH 端口
SSH_PORT=$(grep "^Port" /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}')
SSH_PORT=${SSH_PORT:-22}

# 清理旧规则
iptables -D INPUT -j orasrs_chain 2>/dev/null
iptables -F orasrs_chain 2>/dev/null
iptables -X orasrs_chain 2>/dev/null

# 创建自定义链
iptables -N orasrs_chain

# 1. Accept Established/Related (关键：防止断连)
iptables -A orasrs_chain -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 2. Drop Invalid
iptables -A orasrs_chain -m conntrack --ctstate INVALID -j DROP

# 3. Whitelist SSH (关键：防止管理被锁死)
iptables -A orasrs_chain -p tcp --dport $SSH_PORT -j ACCEPT

# 4. SYN Flood Protection (用户验证的逻辑)
iptables -A orasrs_chain -p tcp --syn -m limit --limit 20/s --limit-burst 50 -j ACCEPT
iptables -A orasrs_chain -p tcp --syn -j DROP

# 5. Threat Blocking
iptables -A orasrs_chain -m set --match-set $IPSET_NAME src -j DROP

# 插入到 INPUT 链顶部
iptables -I INPUT 1 -j orasrs_chain

echo "✅ 防护规则已激活！"
echo ""
echo "验证规则:"
echo "  iptables -nvL orasrs_chain"
echo ""
echo "实时监控:"
echo "  watch -n1 'iptables -nvL orasrs_chain | head -20'"
