# OraSRS 私有网络部署指南

本指南专为希望在内网环境部署 OraSRS 的中国开发者设计。私有网络模式下，所有数据在本地闭环，无需连接公链，完全符合数据安全和合规要求。

## 目录

- [快速开始](#快速开始)
- [架构说明](#架构说明)
- [安装步骤](#安装步骤)
- [配置说明](#配置说明)
- [Wazuh 集成](#wazuh-集成)
- [国密算法支持](#国密算法支持)
- [常见问题](#常见问题)

## 快速开始

### 系统要求

- 操作系统: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- 内存: 最低 4GB，推荐 8GB
- 硬盘: 最低 20GB 可用空间
- 网络: 内网环境即可，无需公网访问

### 一键部署

```bash
# 1. 克隆仓库
git clone https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol
git checkout lite-client

# 2. 运行私有网络安装脚本
sudo bash scripts/install-private-network.sh
```

## 架构说明

### 私有网络架构

```
┌─────────────────────────────────────────────────────┐
│              内网 OraSRS 私有网络                    │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│  │ 节点 1   │◄──►│ 节点 2   │◄──►│ 节点 3   │    │
│  │(客户端)  │    │(客户端)  │    │(客户端)  │    │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    │
│       │               │               │           │
│       └───────────────┼───────────────┘           │
│                       │                           │
│              ┌────────▼────────┐                  │
│              │  本地共识节点    │                  │
│              │  (Hardhat)      │                  │
│              └────────┬────────┘                  │
│                       │                           │
│              ┌────────▼────────┐                  │
│              │  威胁情报数据库  │                  │
│              │  (本地存储)     │                  │
│              └─────────────────┘                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 核心特性

- ✅ **完全本地化**: 所有数据在内网闭环，不对外传输
- ✅ **独立共识**: 使用本地 Hardhat 节点，无需连接公链
- ✅ **AI 评分**: 基于本地机器学习模型的威胁评分
- ✅ **Wazuh 集成**: 完整的 SIEM 集成和自动响应
- ✅ **国密支持**: 支持 SM2/SM3/SM4 算法（可选）

## 安装步骤

### 步骤 1: 安装依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Git
sudo apt install -y git

# 验证安装
node --version  # 应显示 v18.x.x
npm --version   # 应显示 9.x.x
```

### 步骤 2: 部署本地区块链节点

```bash
cd /opt/orasrs

# 安装依赖
npm install

# 启动本地 Hardhat 节点（后台运行）
npx hardhat node > /var/log/orasrs/hardhat.log 2>&1 &

# 部署合约
npx hardhat run deploy/deploy-registry-and-all.js --network localhost
```

### 步骤 3: 配置 OraSRS 客户端

创建配置文件 `/opt/orasrs/config/private-network.yaml`:

```yaml
# 私有网络配置
mode: "private"

# 区块链配置
blockchain:
  enabled: true
  endpoint: "http://127.0.0.1:8545"
  chain_id: 31337  # Hardhat 默认 Chain ID
  local_only: true  # 仅本地模式
  
# 威胁情报配置
threat_intelligence:
  # 关闭链上上报
  blockchain_reporting: false
  
  # 启用本地 AI 评分
  local_ai_scoring: true
  ai_model: "local_ml_model"
  
  # 本地数据库
  database:
    type: "sqlite"
    path: "/var/lib/orasrs/threats.db"

# 地域检测
geographic_policy:
  enabled: true
  mode: "warn"  # 仅警告，不阻止
  auto_local_mode: true  # 检测到中国 IP 自动切换本地模式

# 出站保护（可选）
egress_protection:
  enabled: true
  mode: "monitor"  # 监控模式
  local_cache_only: true  # 仅使用本地缓存
```

### 步骤 4: 启动 OraSRS 客户端

```bash
# 使用私有网络配置启动
sudo systemctl start orasrs-client

# 检查状态
sudo systemctl status orasrs-client

# 查看日志
sudo journalctl -u orasrs-client -f
```

## 配置说明

### 本地 AI 评分

私有网络模式使用本地机器学习模型进行威胁评分，无需连接外部服务。

#### 评分算法

```python
# 本地 AI 评分示例
def calculate_local_risk_score(ip_behavior):
    score = 0
    
    # 1. 扫描行为检测
    if ip_behavior.port_scan_count > 100:
        score += 30
    
    # 2. 暴力破解检测
    if ip_behavior.failed_login_attempts > 10:
        score += 25
    
    # 3. 异常流量检测
    if ip_behavior.traffic_volume > threshold:
        score += 20
    
    # 4. 恶意 Payload 检测
    if ip_behavior.malicious_patterns_detected:
        score += 25
    
    return min(score, 100)
```

#### 模型训练（可选）

```bash
# 使用本地日志数据训练模型
cd /opt/orasrs/ml
python3 train_local_model.py --data /var/log/orasrs/threats.log
```

### 威胁情报本地存储

```sql
-- 本地威胁数据库结构
CREATE TABLE threats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    threat_type TEXT,
    first_seen TIMESTAMP,
    last_seen TIMESTAMP,
    evidence TEXT,
    is_blocked BOOLEAN DEFAULT 0
);

CREATE INDEX idx_ip ON threats(ip_address);
CREATE INDEX idx_score ON threats(risk_score);
```

## Wazuh 集成

### 安装 Wazuh Agent

```bash
# 安装 Wazuh Agent（连接到内网 Wazuh Manager）
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt update
sudo apt install -y wazuh-agent

# 配置 Wazuh Manager 地址（内网地址）
sudo sed -i 's/<address>MANAGER_IP<\/address>/<address>192.168.1.100<\/address>/' /var/ossec/etc/ossec.conf

# 启动 Wazuh Agent
sudo systemctl start wazuh-agent
```

### 配置 OraSRS 集成

```bash
# 复制集成脚本
sudo cp /opt/orasrs/wazuh-integration/custom-orasrs.py /var/ossec/integrations/
sudo chmod 750 /var/ossec/integrations/custom-orasrs.py
sudo chown root:wazuh /var/ossec/integrations/custom-orasrs.py

# 复制规则文件
sudo cp /opt/orasrs/wazuh-integration/orasrs_rules.xml /var/ossec/etc/rules/
sudo chown wazuh:wazuh /var/ossec/etc/rules/orasrs_rules.xml

# 重启 Wazuh
sudo systemctl restart wazuh-agent
```

### 配置 Active Response

编辑 `/var/ossec/etc/ossec.conf`，添加：

```xml
<ossec_config>
  <!-- OraSRS 集成 -->
  <integration>
    <name>custom-orasrs.py</name>
    <hook_url>http://127.0.0.1:3006/orasrs/v1/threats/process</hook_url>
    <level>3</level>
    <alert_format>json</alert_format>
  </integration>

  <!-- Active Response -->
  <active-response>
    <command>firewall-drop</command>
    <location>local</location>
    <rules_id>100001</rules_id>
    <timeout>86400</timeout>  <!-- 24 小时 -->
  </active-response>
</ossec_config>
```

## 国密算法支持

### 启用国密算法

编辑配置文件 `/opt/orasrs/config/private-network.yaml`:

```yaml
# 国密算法配置
cryptography:
  enabled: true
  algorithm: "sm"  # 使用国密算法
  
  # SM2 签名
  sm2:
    enabled: true
    key_path: "/etc/orasrs/keys/sm2_private.pem"
  
  # SM3 哈希
  sm3:
    enabled: true
  
  # SM4 加密
  sm4:
    enabled: true
    key_length: 128
```

### 生成国密密钥

```bash
# 安装 GmSSL
sudo apt install -y gmssl

# 生成 SM2 密钥对
gmssl sm2keygen -out /etc/orasrs/keys/sm2_private.pem
gmssl sm2pubkey -in /etc/orasrs/keys/sm2_private.pem -out /etc/orasrs/keys/sm2_public.pem

# 设置权限
sudo chmod 600 /etc/orasrs/keys/sm2_private.pem
sudo chmod 644 /etc/orasrs/keys/sm2_public.pem
```

## 常见问题

### Q: 私有网络可以连接多少个节点？

**A**: 理论上无限制，但建议不超过 10 个节点以保证性能。对于大型网络，建议使用专业的区块链解决方案（如长安链）。

---

### Q: 如何备份威胁情报数据？

**A**: 定期备份 SQLite 数据库：

```bash
# 备份数据库
sudo cp /var/lib/orasrs/threats.db /backup/threats_$(date +%Y%m%d).db

# 自动备份（添加到 crontab）
0 2 * * * cp /var/lib/orasrs/threats.db /backup/threats_$(date +\%Y\%m\%d).db
```

---

### Q: 私有网络模式下可以使用 HVAP 和 IoT Shield 吗？

**A**: 可以！所有功能都支持，只是威胁情报来源为本地数据库而非公链。

---

### Q: 如何升级到未来的"境内合规模式"？

**A**: 当境内合规模式发布后（预计 2026 Q2），您可以通过以下命令升级：

```bash
git pull origin compliance-mode
sudo bash scripts/upgrade-to-compliance.sh
```

升级过程会保留您的本地数据和配置。

---

### Q: 私有网络是否需要备案？

**A**: 如果仅在企业内网使用，通常不需要备案。但如果涉及互联网访问或对外提供服务，请咨询当地网信办。

---

## 技术支持

如有问题，请通过以下方式获取帮助：

- GitHub Issues: https://github.com/srs-protocol/OraSRS-protocol/issues
- 文档: https://github.com/srs-protocol/OraSRS-protocol/tree/lite-client/docs
- 社区论坛: (待补充)

---

**感谢您选择 OraSRS！私有网络模式让您在享受先进威胁情报技术的同时，完全掌控数据安全。**
