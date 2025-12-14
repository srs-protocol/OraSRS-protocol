#!/bin/bash
# OraSRS Wazuh Agent Configuration Script
# 配置 Wazuh Agent 连接到 Wazuh Manager

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  OraSRS Wazuh Agent Configuration                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 root 权限运行此脚本"
    echo "使用: sudo bash configure-wazuh-agent.sh"
    exit 1
fi

# 询问用户是否有 Wazuh Manager
echo ""
print_info "Wazuh Agent 配置选项:"
echo ""
echo "  1) 我有 Wazuh Manager 服务器（推荐用于生产环境）"
echo "  2) 独立模式 - 仅使用本地规则（适合测试/开发）"
echo "  3) 跳过 Wazuh 配置（仅使用 OraSRS 客户端）"
echo ""
# Ensure we read from terminal even if script is piped
read -p "请选择 [1-3]: " choice < /dev/tty

case $choice in
    1)
        # 配置连接到 Wazuh Manager
        print_info "配置 Wazuh Manager 连接..."
        echo ""
        read -p "请输入 Wazuh Manager IP 地址: " manager_ip
        read -p "请输入 Wazuh Manager 端口 [默认: 1514]: " manager_port
        manager_port=${manager_port:-1514}
        
        print_info "配置 Wazuh Agent..."
        
        # 更新 ossec.conf
        sed -i "s/MANAGER_IP/$manager_ip/g" /var/ossec/etc/ossec.conf
        sed -i "s/<port>1514<\/port>/<port>$manager_port<\/port>/g" /var/ossec/etc/ossec.conf
        
        # 注册 Agent
        print_info "注册 Wazuh Agent..."
        /var/ossec/bin/agent-auth -m $manager_ip || print_warning "自动注册失败，可能需要手动注册"
        
        # 重启服务
        print_info "重启 Wazuh Agent..."
        systemctl restart wazuh-agent
        
        print_success "Wazuh Agent 已配置并连接到 Manager: $manager_ip:$manager_port"
        ;;
        
    2)
        # 独立模式配置
        print_info "配置独立模式..."
        
        # 备份原配置
        cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak.standalone
        
        # 创建独立模式配置
        cat > /var/ossec/etc/ossec.conf << 'EOF'
<ossec_config>
  <client>
    <server>
      <address>127.0.0.1</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
    <config-profile>ubuntu, ubuntu20, ubuntu20.04</config-profile>
    <notify_time>10</notify_time>
    <time-reconnect>60</time-reconnect>
    <auto_restart>yes</auto_restart>
  </client>

  <client_buffer>
    <disabled>no</disabled>
    <queue_size>5000</queue_size>
    <events_per_second>500</events_per_second>
  </client_buffer>

  <!-- Local analysis -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <!-- OraSRS Integration -->
  <integration>
    <name>custom-orasrs.py</name>
    <hook_url>http://127.0.0.1:3006/orasrs/v1/threats/process</hook_url>
    <level>7</level>
    <alert_format>json</alert_format>
  </integration>

  <active-response>
    <disabled>no</disabled>
  </active-response>
</ossec_config>
EOF
        
        print_warning "独立模式已配置，但 Wazuh Agent 需要 Manager 才能完全运行"
        print_info "OraSRS 集成已配置，可以独立使用 OraSRS 客户端"
        ;;
        
    3)
        # 跳过 Wazuh 配置
        print_info "跳过 Wazuh 配置..."
        print_info "停止 Wazuh Agent 服务..."
        systemctl stop wazuh-agent
        systemctl disable wazuh-agent
        
        print_success "Wazuh Agent 已禁用"
        print_info "OraSRS 客户端仍然可以独立运行"
        ;;
        
    *)
        print_error "无效选择"
        exit 1
        ;;
esac

echo ""
print_success "配置完成！"
echo ""

# 显示 OraSRS 客户端状态
print_info "OraSRS 客户端状态:"
if systemctl is-active --quiet orasrs-client; then
    print_success "OraSRS 客户端正在运行"
    echo "  API: http://127.0.0.1:3006"
    echo "  健康检查: curl http://127.0.0.1:3006/health"
else
    print_warning "OraSRS 客户端未运行"
    echo "  启动: sudo systemctl start orasrs-client"
fi

echo ""
print_info "推荐的使用方式:"
echo ""
echo "  选项 1 (有 Wazuh Manager):"
echo "    - Wazuh Agent 连接到 Manager"
echo "    - Wazuh 检测威胁并调用 OraSRS API"
echo "    - OraSRS 提供风险评分"
echo "    - Wazuh 执行响应动作"
echo ""
echo "  选项 2/3 (无 Wazuh Manager):"
echo "    - 直接使用 OraSRS 客户端 API"
echo "    - 应用程序调用 OraSRS 查询风险"
echo "    - 基于风险评分做出决策"
echo ""
echo "  使用 OraSRS CLI:"
echo "    - orasrs-cli status    # 查看状态"
echo "    - orasrs-cli query IP  # 查询 IP"
echo "    - orasrs-cli stats     # 查看统计"
echo ""
