#!/bin/bash
# OraSRS Lite Client 一键安装脚本

echo "正在安装 OraSRS Lite Client..."

# 检查系统类型
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    SYSTEM_TYPE="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    SYSTEM_TYPE="macos"
else
    echo "不支持的操作系统: $OSTYPE"
    exit 1
fi

echo "检测到系统类型: $SYSTEM_TYPE"

# 检查是否已安装 Rust
if ! command -v rustc &> /dev/null; then
    echo "正在安装 Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source ~/.cargo/env
fi

# 检查是否已安装 Node.js
if ! command -v node &> /dev/null; then
    echo "正在安装 Node.js..."
    if [[ "$SYSTEM_TYPE" == "linux" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        brew install node
    fi
fi

# 安装 Tauri CLI
echo "正在安装 Tauri CLI..."
cargo install tauri-cli --version "^1.0"

# 安装项目依赖
echo "正在安装项目依赖..."
npm install

# 构建项目
echo "正在构建 OraSRS Lite Client..."
npm run tauri build

echo "OraSRS Lite Client 安装完成！"
echo "运行 'npm run tauri dev' 开发模式启动"
echo "运行 'npm run tauri build' 生产模式构建"