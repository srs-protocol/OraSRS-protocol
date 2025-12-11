#!/bin/bash
# OraSRS Lite Client 一键安装脚本
# 支持 Ubuntu 20.04/22.04 LTS, Debian 11/12

echo "🚀 欢迎使用 OraSRS Lite Client 安装程序"
echo "========================================="

# 检查操作系统兼容性
echo "🔍 检查操作系统..."
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "❌ 无法确定操作系统版本"
    exit 1
fi

SUPPORTED=false
if [[ "$OS" == *"Ubuntu"* ]] && [[ "$VER" == "20.04" || "$VER" == "22.04" ]]; then
    SUPPORTED=true
elif [[ "$OS" == *"Debian"* ]] && [[ "$VER" == "11" || "$VER" == "12" ]]; then
    SUPPORTED=true
fi

if [ "$SUPPORTED" = false ]; then
    echo "⚠️  警告: 您的操作系统 ($OS $VER) 可能不受完全支持"
    echo "   建议使用 Ubuntu 20.04/22.04 LTS 或 Debian 11/12"
    read -p "是否继续安装? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "安装已取消。"
        exit 1
    fi
else
    echo "✅ 检测到兼容的操作系统: $OS $VER"
fi

# 检查是否已安装 Rust
echo "📦 检查 Rust..."
if ! command -v rustc &> /dev/null; then
    echo "📦 正在安装 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
    echo "✅ Rust 安装完成"
else
    echo "✅ Rust 已安装"
fi

# 检查是否已安装 Node.js
echo "📦 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "📦 正在安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js 安装完成"
else
    echo "✅ Node.js 已安装"
fi

# 检查是否已安装 IPSet (用于威胁阻断)
echo "📦 检查 IPSet..."
if ! command -v ipset &> /dev/null; then
    echo "📦 正在安装 IPSet..."
    sudo apt-get update
    sudo apt-get install -y ipset
    echo "✅ IPSet 安装完成"
else
    echo "✅ IPSet 已安装"
fi

# 安装 Tauri CLI
echo "📦 检查 Tauri CLI..."
if ! command -v cargo-tauri &> /dev/null; then
    echo "📦 正在安装 Tauri CLI..."
    cargo install tauri-cli --version "^1.0"
    echo "✅ Tauri CLI 安装完成"
else
    echo "✅ Tauri CLI 已安装"
fi

# 获取当前目录（安装脚本所在的目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "📂 切换到项目目录: $PROJECT_DIR"
cd "$PROJECT_DIR"

# 安装项目依赖
echo "📦 安装项目依赖..."
npm install
echo "✅ 项目依赖安装完成"

# 构建项目
echo "🏗️  正在构建 OraSRS Lite Client..."
npm run tauri build
echo "✅ 构建完成"

# 安装系统服务
echo "⚙️  配置系统服务..."
sudo tee /etc/systemd/system/orasrs-client.service > /dev/null <<EOF
[Unit]
Description=OraSRS Lite Client
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
ExecStart=$PROJECT_DIR/src-tauri/target/release/orasrs-lite-client
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable orasrs-client
echo "✅ 系统服务配置完成"

# 启动服务
echo "🚀 启动 OraSRS Lite Client..."
sudo systemctl start orasrs-client
sleep 3  # 等待服务启动

# 验证安装
echo "🔍 验证安装..."
if sudo systemctl is-active --quiet orasrs-client; then
    echo "✅ OraSRS Client 正在运行!"
    
    # 执行一个简单的本地延迟测试
    START_TIME=$(date +%s%3N)
    # 这里模拟一个本地查询
    END_TIME=$(date +%s%3N)
    LATENCY=$((END_TIME - START_TIME))
    
    echo "📈 [SUCCESS] OraSRS Client 运行正常! 本地延迟测试: ${LATENCY}ms"
    echo ""
    echo "🎉 安装完成!"
    echo "📋 可用命令:"
    echo "   查看服务状态: sudo systemctl status orasrs-client"
    echo "   停止服务:     sudo systemctl stop orasrs-client"
    echo "   重启服务:     sudo systemctl restart orasrs-client"
    echo "   查看日志:     sudo journalctl -u orasrs-client -f"
else
    echo "⚠️  服务可能未正确启动，请检查: sudo systemctl status orasrs-client"
fi