# OraSRS Alpha Testing Policy

## 🌐 测试节点地域政策 / Geographic Testing Policy (2025年12月更新 / December 2025 Update)

> **OraSRS Alpha 测试目前仅面向中国大陆以外的节点开放。**
> 
> **OraSRS Alpha testing is currently only open to nodes outside mainland China.**

---

## 原因说明 / Rationale

### 中文
- **跨境数据合规风险**: 为避免潜在的跨境数据传输合规问题，确保测试过程符合各司法辖区的安全法规
- **数据准确性与可追溯性**: 海外独立 IP 环境更利于威胁情报的验证和追溯
- **聚焦核心协议**: 暂不处理复杂的本地化适配问题，专注于核心协议机制的验证

### English
- **Cross-border Data Compliance**: To avoid potential cross-border data transfer compliance issues and ensure the testing process complies with security regulations in all jurisdictions
- **Data Accuracy and Traceability**: Independent IP environments overseas are more conducive to verification and tracing of threat intelligence
- **Focus on Core Protocol**: Temporarily not handling complex localization adaptation issues, focusing on verification of core protocol mechanisms

---

## 对中国开发者的说明 / Notice for Chinese Developers

### 中文

#### ✅ 您仍然可以：

1. **部署私有网络**
   - 协议本身完全开源（Apache 2.0 许可证）
   - 您可以自由部署私有的 OraSRS 网络
   - 私有网络**无需连接主协议链**，所有数据本地闭环
   - 参见：[私有网络部署指南](../private-network-zh.md)

2. **学习和研究**
   - 阅读源代码和学术论文
   - 在本地环境测试协议功能
   - 参与社区讨论和改进建议

3. **等待合规版本**
   - 我们正在开发**"境内合规模式"**
   - 包括：纯内网共识、等保认证版本、国密算法集成
   - 预计 2026 年 Q2 推出

#### ⚠️ 暂时限制：

- 不建议将位于中国大陆的节点连接到 Alpha 测试网络
- 客户端会检测地理位置并给出提示（非强制，仅警告）

### English

#### ✅ You Can Still:

1. **Deploy Private Networks**
   - The protocol is fully open source (Apache 2.0 license)
   - You can freely deploy private OraSRS networks
   - Private networks **do not need to connect to the main protocol chain**, all data stays local
   - See: [Private Network Deployment Guide](../private-network-zh.md)

2. **Learn and Research**
   - Read source code and academic papers
   - Test protocol features in local environments
   - Participate in community discussions and improvement suggestions

3. **Wait for Compliance Version**
   - We are developing a **"Domestic Compliance Mode"**
   - Including: Pure intranet consensus, Cybersecurity Level Protection certification, SM cryptography integration
   - Expected release: Q2 2026

#### ⚠️ Temporary Restrictions:

- Not recommended to connect nodes located in mainland China to the Alpha test network
- Client will detect geographic location and provide warnings (non-mandatory, warning only)

---

## 地域检测机制 / Geographic Detection Mechanism

### 客户端检测 / Client Detection

客户端启动时会进行地域检测（仅提示，不强制）：

```javascript
// Geographic detection (warning only, not enforced)
async function checkGeographicRestriction() {
  try {
    const publicIP = await getPublicIP();
    const isChinaIP = await isChinaASN(publicIP);
    
    if (isChinaIP) {
      console.warn('⚠️  检测到您位于中国大陆。OraSRS Alpha 测试暂不开放国内节点接入。');
      console.warn('⚠️  Detected you are in mainland China. OraSRS Alpha testing is not open to domestic nodes.');
      console.warn('');
      console.warn('   您可部署私有网络 / You can deploy a private network:');
      console.warn('   https://github.com/srs-protocol/OraSRS-protocol/blob/lite-client/docs/private-network-zh.md');
      console.warn('');
      console.warn('   继续运行将仅使用本地模式（不连接主链）');
      console.warn('   Continuing will run in local-only mode (no main chain connection)');
      
      // 自动切换到本地模式
      config.localOnly = true;
      config.blockchainEnabled = false;
    }
  } catch (error) {
    console.log('地域检测失败，继续运行 / Geographic detection failed, continuing');
  }
}
```

### 配置选项 / Configuration Options

```yaml
# orasrs.yaml
geographic_policy:
  enabled: true
  mode: "warn"  # 选项: warn (警告) | block (阻止) | disabled (禁用)
  
  # 本地模式配置
  local_only_mode:
    enabled: false  # 检测到中国 IP 时自动启用
    blockchain_sync: false
    threat_reporting: false
    use_local_ai_scoring: true
```

---

## 私有网络部署 / Private Network Deployment

### 快速开始 / Quick Start

```bash
# 1. 克隆仓库
git clone https://github.com/srs-protocol/OraSRS-protocol.git
cd OraSRS-protocol

# 2. 切换到私有网络分支
git checkout private-network

# 3. 启动私有网络
./scripts/start-private-network.sh
```

### 功能特性 / Features

- ✅ **完全本地化**: 所有数据在内网闭环，不对外传输
- ✅ **独立共识**: 使用本地 BFT 共识，无需连接公链
- ✅ **AI 评分**: 基于本地机器学习模型的威胁评分
- ✅ **Wazuh 集成**: 完整的 SIEM 集成和自动响应
- ✅ **国密支持**: 支持 SM2/SM3/SM4 算法

详细文档请参阅：[私有网络部署指南](docs/private-network-zh.md)

---

## 未来计划 / Future Plans

### 境内合规模式 / Domestic Compliance Mode (Q2 2026)

我们正在开发符合中国法规的合规版本：

#### 技术特性
- **纯内网共识**: 所有节点部署在境内，数据不出境
- **等保认证**: 通过网络安全等级保护 2.0 认证
- **国密算法**: 全面使用 SM2/SM3/SM4 国密算法
- **审计日志**: 完整的操作审计和日志留存
- **应急响应**: 符合《网络安全法》的应急响应机制

#### 合规要求
- 运营主体需完成 ICP 备案
- 通过公安部网络安全等级保护测评
- 数据存储和处理符合《数据安全法》
- 威胁情报共享符合《个人信息保护法》

---

## 常见问题 / FAQ

### Q: 为什么限制中国节点？
**A**: 主要出于合规考虑。Alpha 测试涉及跨境数据传输，为避免潜在的法律风险，暂时限制国内节点接入。我们正在开发符合国内法规的合规版本。

### Q: Why restrict Chinese nodes?
**A**: Primarily for compliance reasons. Alpha testing involves cross-border data transmission. To avoid potential legal risks, we temporarily restrict domestic node access. We are developing a compliant version that meets domestic regulations.

---

### Q: 我可以在中国使用 OraSRS 吗？
**A**: 可以！您可以部署私有网络，所有数据在本地闭环，无需连接公链。这完全合法且安全。

### Q: Can I use OraSRS in China?
**A**: Yes! You can deploy a private network where all data stays local without connecting to the public chain. This is completely legal and safe.

---

### Q: 什么时候开放国内测试？
**A**: 预计 2026 年 Q2 推出境内合规模式后，将重新开放国内节点测试。届时会提供完整的合规文档和认证。

### Q: When will domestic testing be open?
**A**: Expected to reopen domestic node testing after the launch of the domestic compliance mode in Q2 2026. Complete compliance documentation and certification will be provided.

---

## 联系我们 / Contact Us

如有疑问或建议，请通过以下方式联系：

- GitHub Issues: https://github.com/srs-protocol/OraSRS-protocol/issues
- Email: (待补充 / TBD)
- 社区论坛: (待补充 / TBD)

---

**感谢您的理解。安全协议的演进，需要在创新与合规之间谨慎平衡。**

**Thank you for your understanding. The evolution of security protocols requires a careful balance between innovation and compliance.**
