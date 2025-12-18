# 高级集成 / Advanced Integrations（研究参考）

> 🇺🇸 **English Version: [Click here for the English Documentation](./05-integrations.md)**

## Wazuh + OraSRS 集成安装 (高级安全)

如果您希望将 OraSRS 集成到 Wazuh 安全平台，实现自动威胁阻断：

```bash
curl -fsSL https://raw.githubusercontent.com/srs-protocol/OraSRS-protocol/lite-client/install-wazuh-orasrs.sh | bash
```

此脚本将：
1. 安装/更新 OraSRS 客户端（限制为本地访问）。
2. 安装 Wazuh Agent。

**工作原理 (先风控后查询):**
- **Wazuh 发现威胁**: 触发集成脚本调用 OraSRS 接口 `/v1/threats/process`。
- **OraSRS 决策**:
  - **白名单**: 直接放行。
  - **动态风控**: 根据威胁等级计算封禁时长（高危 3天，严重 7天，默认 24小时）。
  - **本地/链上协同**: 优先查询本地缓存（若命中则叠加时长），其次查询链上数据（若命中则最大封禁）。
  - **新威胁**: 写入本地缓存并异步上报链上。
- **Active Response**: Wazuh 根据 OraSRS 返回的指令执行 `firewall-drop`。

## 🛡️ 高价值资产保护 (HVAP) 配置

针对 SSH/MySQL 等关键服务，启用基于 OraSRS 评分的动态访问控制：

1. **安装 PAM 模块** (已包含在上述脚本中)
2. **启用 SSH 保护**:
   编辑 `/etc/pam.d/sshd`，在文件顶部添加：
   ```bash
   auth required pam_exec.so /opt/orasrs/pam/pam_orasrs.py
   ```
   这将拦截高风险 IP (Score >= 80) 的登录尝试，有效防御 0-day 攻击探测。

**HVAP 防御逻辑:**
- **L1 (Score < 40)**: 正常放行。
- **L2 (40 <= Score < 80)**: 警告/建议 MFA。
- **L3 (Score >= 80)**: **直接拦截** (拒绝访问)。

**应急响应 (人工确认):**
若需临时放行被误拦的 IP，管理员可调用临时白名单接口：
```bash
curl -X POST http://127.0.0.1:3006/orasrs/v1/whitelist/temp \
  -H "Content-Type: application/json" \
  -d '{"ip":"1.2.3.4", "duration":300}'
```
此操作将允许该 IP 在 5 分钟内绕过 HVAP 拦截。

## 浏览器扩展

我们还提供浏览器扩展插件，可直接从浏览器保护您的网络安全：

- 支持 Chrome 和 Firefox
- 实时威胁防护
- 基于 OraSRS 协议链的去中心化威胁情报
- 隐私保护设计
