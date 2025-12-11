#!/bin/bash

# OraSRS 轻量级客户端发布脚本
# 用于构建和打包OraSRS轻量级客户端

set -e  # 遇到错误时退出

echo "🚀 开始构建 OraSRS 轻量级客户端发布版本..."

# 检查依赖
echo "🔍 检查依赖..."
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "⚠️  警告: cargo 未安装，将使用预构建版本"
    echo "   如果需要从源码构建，请安装Rust工具链"
fi

# 进入客户端目录
cd /home/Great/SRS-Protocol/orasrs-lite-client

echo "📦 安装前端依赖..."
npm install

echo "🔧 构建Tauri应用..."
# 检查是否安装了Tauri CLI
if command -v cargo &> /dev/null && command -v cargo tauri &> /dev/null; then
    cargo tauri build --release
else
    echo "⚠️  未检测到Tauri CLI，创建发布目录结构..."
    mkdir -p dist
    echo "ℹ️  请手动构建Tauri应用: cargo tauri build --release"
fi

echo "📝 生成发布配置..."
cat > dist/client-config.json << EOF
{
  "version": "2.0.0",
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "features": [
    "incremental_updates",
    "ttl_expiry",
    "silent_mode",
    "cross_platform",
    "openwrt_support",
    "nginx_integration"
  ],
  "blockchainConfig": {
    "defaultEndpoint": "https://orasrs-chain.example.com",
    "contractAddresses": {
      "threatIntel": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "securityAction": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    }
  },
  "clientConfig": {
    "defaultUpdateInterval": 300,
    "memoryLimit": 5242880,
    "defaultSilentMode": true,
    "maxThreatsCache": 10000
  }
}
EOF

echo "💾 创建发布包..."
mkdir -p releases
RELEASE_DIR="releases/orasrs-lite-client-v2.0.0-$(date +%Y%m%d)"
mkdir -p "$RELEASE_DIR"

# 复制必要的文件
cp -r dist/* "$RELEASE_DIR/" 2>/dev/null || echo "⚠️  没有找到构建输出，跳过复制"
cp ../orasrs-agent/USAGE.md "$RELEASE_DIR/README.md" 2>/dev/null || echo "⚠️  没有找到USAGE.md，使用默认说明"
cp RELEASE_NOTES.md "$RELEASE_DIR/"
cp ../LICENSE "$RELEASE_DIR/"

# 创建默认README
if [ ! -f "$RELEASE_DIR/README.md" ]; then
    cat > "$RELEASE_DIR/README.md" << EOF
# OraSRS 轻量级客户端 v2.0.0

## 简介
OraSRS轻量级客户端是一个基于Tauri框架（Rust + 前端）构建的桌面应用，专为资源受限环境设计。

## 安装
1. 解压安装包
2. 运行安装程序
3. 启动应用

## 功能特性
- 增量更新机制
- TTL过期淘汰
- 静默模式
- 跨平台支持
- OpenWrt集成
- Nginx集成

## 配置
首次启动时，客户端会创建默认配置文件。

## 技术支持
- GitHub Issues: https://github.com/srs-protocol/orasrs-protocol/issues
- Discord: https://discord.gg/orasrs
EOF
fi

echo "🔧 创建OpenWrt包..."
# 创建OpenWrt包的目录结构
mkdir -p "$RELEASE_DIR/openwrt-package"
cat > "$RELEASE_DIR/openwrt-package/Makefile" << EOF
# OpenWrt Package Makefile for OraSRS Lite Client
# 用于构建OpenWrt包

include \$(TOPDIR)/rules.mk

PKG_NAME:=orasrs-client
PKG_VERSION:=2.0.0
PKG_RELEASE:=1

PKG_BUILD_DIR := \$(BUILD_DIR)/\$(PKG_NAME)-\$(PKG_VERSION)

include \$(INCLUDE_DIR)/package.mk

define Package/orasrs-client
  SECTION:=net
  CATEGORY:=Network
  TITLE:=OraSRS Threat Intelligence Client
  DEPENDS:=+iptables +libubox20191227 +libuci +curl
  MAINTAINER:=OraSRS Team
endef

define Package/orasrs-client/description
  Lightweight threat intelligence client for OraSRS protocol.
  Designed to run on resource-constrained devices like routers.
endef

define Build/Prepare
	mkdir -p \$(PKG_BUILD_DIR)
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/orasrs-client/install
	\$(INSTALL_DIR) \$(1)/usr/bin
	\$(INSTALL_BIN) ./bin/orasrs_client.sh \$(1)/usr/bin/orasrs_client
	
	\$(INSTALL_DIR) \$(1)/etc/config
	\$(INSTALL_DATA) ./etc/config/orasrs \$(1)/etc/config/orasrs
	
	\$(INSTALL_DIR) \$(1)/etc/init.d
	\$(INSTALL_BIN) ./etc/init.d/orasrs \$(1)/etc/init.d/orasrs
endef

\$(eval \$(call BuildPackage,orasrs-client))
EOF

echo "🔧 创建安装脚本..."
cat > "$RELEASE_DIR/install.sh" << 'EOF'
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
sudo tee /usr/local/bin/orasrs-client > /dev/null << 'SCRIPT_EOF'
#!/bin/bash
# OraSRS 客户端启动脚本
cd /opt/orasrs-client
./orasrs-lite-client "$@"
SCRIPT_EOF

sudo chmod +x /usr/local/bin/orasrs-client

echo "✅ OraSRS 轻量级客户端安装完成！"
echo "💡 启动客户端: orasrs-client"
echo "🔧 配置文件位置: ~/.config/orasrs-lite-client/"
EOF

chmod +x "$RELEASE_DIR/install.sh"

echo "🌐 创建Nginx配置示例..."
mkdir -p "$RELEASE_DIR/nginx-module"
cat > "$RELEASE_DIR/nginx-module/nginx-config-example.conf" << 'EOF'
# OraSRS Threat Intelligence Integration for Nginx
# This example shows how to integrate OraSRS threat intelligence with Nginx

# Main server configuration
server {
    listen 80;
    server_name example.com;

    # Location block to check threats before processing requests
    location / {
        # Use the OraSRS threat check API
        access_by_lua_block {
            local http = require "resty.http"
            local httpc = http.new()
            
            # Check if the client IP is in the threat list
            local client_ip = ngx.var.remote_addr
            local res, err = httpc:request_uri("http://127.0.0.1:8080/api/check-threat", {
                method = "POST",
                body = '{"ip":"' .. client_ip .. '"}',
                headers = {
                    ["Content-Type"] = "application/json"
                }
            })
            
            if res and res.status == 200 then
                local cjson = require "cjson"
                local threat_data = cjson.decode(res.body)
                
                if threat_data.blocked then
                    ngx.status = 403
                    ngx.say("Access denied: Threat detected - " .. threat_data.reason)
                    ngx.exit(403)
                end
            end
        }

        # Your normal application configuration
        root /var/www/html;
        index index.html index.htm;
    }
}

# API endpoint for threat checking (this would be handled by OraSRS client)
server {
    listen 8080;
    server_name 127.0.0.1;
    
    # Location to receive threat check requests from Nginx
    location /api/check-threat {
        # This would be handled by the OraSRS client via Tauri
        # For demonstration, we're showing the integration pattern
        content_by_lua_block {
            ngx.req.read_body()
            local body = ngx.req.get_body_data()
            
            if body then
                ngx.log(ngx.INFO, "Received threat check request: " .. body)
                # In a real implementation, this would call the OraSRS client via Tauri
                ngx.print([[{"blocked": false, "reason": "No threat detected", "threat_level": 0}]])
            else
                ngx.status = 400
                ngx.print("Bad Request")
            end
        }
    }
}
EOF

echo "✅ OraSRS 轻量级客户端发布版本已准备就绪！"
echo "📁 发布包位置: $RELEASE_DIR"
echo ""
echo "📦 包含以下组件:"
echo "   - 桌面客户端 (Tauri应用)"
echo "   - OpenWrt包 (Makefile)"
echo "   - Nginx集成模块"
echo "   - 安装脚本"
echo "   - 配置示例"
echo "   - 发布说明"

echo "📋 发布验证清单:"
echo "   1. [ ] 测试桌面客户端安装 (Windows/macOS/Linux)"
echo "   2. [ ] 测试OpenWrt包安装"
echo "   3. [ ] 验证Nginx集成功能"
echo "   4. [ ] 确认增量更新功能"
echo "   5. [ ] 验证TTL过期机制"
echo "   6. [ ] 测试静默模式"
echo "   7. [ ] 验证威胁检测和上报"
echo "   8. [ ] 检查内存占用 < 5MB"
echo ""
echo "🎉 发布准备完成！"
EOF