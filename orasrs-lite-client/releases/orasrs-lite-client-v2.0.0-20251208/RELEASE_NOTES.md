# OraSRS 轻量级客户端发布说明

## 版本信息
- **版本**: 2.0.0
- **发布日期**: 2025-12-07
- **协议版本**: OraSRS v2.0 协调防御协议

## 概述
OraSRS轻量级客户端是一个基于Tauri框架（Rust + 前端）构建的桌面应用，专为资源受限环境设计。该客户端实现了OraSRS协议的"底层安全免疫系统"愿景，通过标准化接口可以无缝集成到各种安全解决方案中。

## 核心功能

### 1. 增量更新机制
- 仅同步最新威胁情报，大幅减少网络流量
- 使用布隆过滤器优化存储效率
- 支持断点续传，提高更新可靠性

### 2. TTL过期淘汰
- 自动清理过期威胁数据
- 防止规则库无限膨胀，拖慢网速
- 智能内存管理，保持低资源占用

### 3. 静默模式
- 默认静默运行，不打扰用户
- 仅在高危威胁（如勒索病毒通信）时弹窗提醒
- 可配置威胁等级阈值

### 4. 跨平台支持
- **桌面端**: Windows、macOS、Linux
- **路由器**: OpenWrt（128MB内存限制）
- **Web服务器**: Nginx集成模块

## 部署说明

### 桌面客户端
1. 下载对应平台的安装包
2. 运行安装程序
3. 首次启动时配置区块链同步节点
4. 启用静默模式（推荐）

### OpenWrt路由器
1. 下载`orasrs-client`包
2. 通过OPKG安装
```bash
opkg install orasrs-client_2.0.0_*.ipk
```
3. 配置启动参数
```bash
uci set orasrs.main.enabled=1
uci set orasrs.main.silent_mode=1
uci commit orasrs
```
4. 启动服务
```bash
/etc/init.d/orasrs start
```

### Nginx集成
在Nginx配置中添加威胁检查逻辑：
```nginx
location / {
    # 检查客户端IP是否在威胁列表中
    access_by_lua_block {
        local threat_check = require "orasrs-threat-check"
        if threat_check.is_threat(ngx.var.remote_addr) then
            ngx.status = 403
            ngx.say("Access denied: Threat detected")
            ngx.exit(403)
        end
    }
    
    # 原有业务逻辑
    proxy_pass http://backend;
}
```

## 配置选项

### 桌面客户端配置
- `silent_mode`: 静默模式开关 (默认: true)
- `update_interval`: 更新间隔（秒）(默认: 300)
- `memory_limit`: 内存限制（MB）(默认: 5)
- `block_high_risk_only`: 仅阻断高风险IP (默认: false)

### 路由器配置
- `enabled`: 启用状态 (默认: 1)
- `update_interval`: 更新间隔（秒）(默认: 300)
- `memory_limit`: 内存限制（KB）(默认: 32000)
- `log_level`: 日志级别 (默认: warning)

## API接口

### 桌面客户端API
- `GET /api/threats`: 获取威胁列表
- `POST /api/block`: 添加阻断规则
- `GET /api/status`: 获取客户端状态
- `POST /api/config`: 更新配置

### 服务端API
- `POST /orasrs/v2/threat-report`: 提交威胁报告
- `GET /orasrs/v2/threat-list`: 获取全局威胁列表
- `POST /orasrs/v2/threat-verify`: 验证威胁报告

## 安全特性

### 隐私保护
- IP地址匿名化处理
- 本地数据加密存储
- 无用户行为上报
- 符合GDPR/CCPA合规要求

### 防护能力
- DDoS攻击防护
- 恶意软件传播阻断
- 勒索病毒通信检测
- 恶意C2服务器阻断

## 性能指标

### 桌面客户端
- **内存占用**: < 5MB
- **CPU占用**: < 5%
- **磁盘占用**: < 50MB
- **网络流量**: < 10KB/次更新

### 路由器版本
- **内存占用**: < 32MB
- **CPU占用**: < 3%
- **网络流量**: < 5KB/次更新

## 故障排除

### 常见问题
1. **无法连接区块链**: 检查网络连接和防火墙设置
2. **更新失败**: 确认配置文件中的更新源地址
3. **内存占用过高**: 检查TTL过期配置

### 日志位置
- Linux: `~/.config/orasrs-lite-client/logs/`
- Windows: `%APPDATA%\orasrs-lite-client\logs\`
- macOS: `~/Library/Application Support/orasrs-lite-client/logs/`

## 升级指南

### 从v1.x升级
1. 备份现有配置
2. 停止现有服务
3. 安装新版本
4. 恢复配置
5. 重启服务

## 开源协议
本项目采用Apache License 2.0开源协议，欢迎社区贡献和反馈。