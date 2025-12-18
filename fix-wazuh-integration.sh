#!/bin/bash
# OraSRS Wazuh Integration Quick Fix
# 修复 /var/ossec/etc/rules 目录缺失问题

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

print_info "OraSRS Wazuh Integration Quick Fix"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行此脚本"
    echo "使用: sudo bash fix-wazuh-integration.sh"
    exit 1
fi

# 1. 创建缺失的目录
print_info "创建 Wazuh 目录..."
mkdir -p /var/ossec/etc/rules
mkdir -p /var/ossec/integrations
print_success "目录已创建"

# 2. 复制规则文件
print_info "安装 OraSRS 规则文件..."
if [ -f /opt/orasrs/wazuh-integration/orasrs_rules.xml ]; then
    cp /opt/orasrs/wazuh-integration/orasrs_rules.xml /var/ossec/etc/rules/orasrs_rules.xml
    chown wazuh:wazuh /var/ossec/etc/rules/orasrs_rules.xml 2>/dev/null || chown root:root /var/ossec/etc/rules/orasrs_rules.xml
    chmod 640 /var/ossec/etc/rules/orasrs_rules.xml
    print_success "规则文件已安装"
else
    print_error "规则文件不存在: /opt/orasrs/wazuh-integration/orasrs_rules.xml"
    exit 1
fi

# 3. 复制集成脚本
print_info "安装 OraSRS 集成脚本..."
if [ -f /opt/orasrs/wazuh-integration/custom-orasrs.py ]; then
    cp /opt/orasrs/wazuh-integration/custom-orasrs.py /var/ossec/integrations/custom-orasrs.py
    chmod 750 /var/ossec/integrations/custom-orasrs.py
    chown root:wazuh /var/ossec/integrations/custom-orasrs.py 2>/dev/null || chown root:root /var/ossec/integrations/custom-orasrs.py
    print_success "集成脚本已安装"
else
    print_error "集成脚本不存在: /opt/orasrs/wazuh-integration/custom-orasrs.py"
    exit 1
fi

# 4. 更新 ossec.conf
print_info "更新 Wazuh 配置..."
if [ -f /var/ossec/etc/ossec.conf ]; then
    if ! grep -q "custom-orasrs" /var/ossec/etc/ossec.conf; then
        # 创建备份
        cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak.$(date +%Y%m%d_%H%M%S)
        
        # 添加配置
        if [ -f /opt/orasrs/wazuh-integration/ossec.conf.snippet ]; then
            sed -i '/<\/ossec_config>/e cat /opt/orasrs/wazuh-integration/ossec.conf.snippet' /var/ossec/etc/ossec.conf
            print_success "配置已更新"
        else
            print_error "配置片段不存在，请手动配置"
        fi
    else
        print_info "配置已存在，跳过"
    fi
else
    print_error "ossec.conf 不存在"
    exit 1
fi

# 5. 重启 Wazuh Agent
print_info "重启 Wazuh Agent..."
systemctl restart wazuh-agent || service wazuh-agent restart || print_error "重启失败，请手动重启"
print_success "Wazuh Agent 已重启"

echo ""
print_success "修复完成！"
echo ""
print_info "验证安装:"
echo "  1. 检查规则文件: ls -la /var/ossec/etc/rules/orasrs_rules.xml"
echo "  2. 检查集成脚本: ls -la /var/ossec/integrations/custom-orasrs.py"
echo "  3. 检查 Wazuh 状态: systemctl status wazuh-agent"
echo "  4. 查看 Wazuh 日志: tail -f /var/ossec/logs/ossec.log"
echo ""
