#!/bin/bash
# OraSRS 轻量级客户端安装脚本

set -e

echo "🚀 安装 OraSRS 轻量级客户端..."

# 检查操作系统
OS_TYPE=$(uname -s | tr '[:upper:]' '[:lower:]')

# 安装目录
INSTALL_DIR="/opt/orasrs-client"

# 创建安装目录
sudo mkdir -p $INSTALL_DIR

# 复制客户端文件
sudo cp -r ./* $INSTALL_DIR/

# 创建启动脚本
sudo cat > /usr/local/bin/orasrs-client << 'SCRIPT_EOF'
#!/bin/bash
# OraSRS 客户端启动脚本
cd /opt/orasrs-client
./orasrs-lite-client "$@"
SCRIPT_EOF

sudo chmod +x /usr/local/bin/orasrs-client

echo "✅ OraSRS 轻量级客户端安装完成！"
echo "💡 启动客户端: orasrs-client"
echo "🔧 配置文件位置: ~/.config/orasrs-lite-client/"
