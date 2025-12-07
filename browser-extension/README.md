# OraSRS Browser Extension

OraSRS Browser Extension 是一个基于区块链的去中心化安全防护浏览器扩展，它连接到 OraSRS 协议链 (api.orasrs.net) 获取实时威胁情报，并在浏览器中提供主动威胁防护。

## 功能特性

### 1. 实时威胁防护
- 连接到 OraSRS 協議鏈獲取實時威脅情報
- 自動阻止惡意 IP、域名和 URL
- 支持多種威脅類型檢測

### 2. 智能监控
- 監控網絡請求 (fetch, XMLHttpRequest)
- 檢測惡意腳本和 iframe
- 防止表單提交到威脅地址

### 3. 定期更新
- 自動從區塊鏈獲取最新威脅數據
- 支持手動更新威脅列表
- 本地緩存優化性能

### 4. 隱私保護
- 本地運行，無需發送個人數據
- 符合 GDPR/CCPA 隱私要求
- 最小化權限需求

## 技术架构

### 威脅數據獲取
- 通過 HTTPS API 連接到 `api.orasrs.net`
- 定期獲取最新的威脅情報數據
- 支持增量更新以減少帶寬使用

### 瀏覽器監控
- Content Script: 注入到网页中监控网络请求和DOM变化
- Background Script: 处理扩展后台逻辑和数据更新
- Popup Interface: 用户界面交互

### 數據結構
- 使用 Set 數據結構優化威脅匹配性能
- 本地存儲威脅數據緩存
- 支持過期淘汰機制

## 安裝和使用

### 1. 安裝擴展
1. 打開瀏覽器擴展管理頁面 (chrome://extensions 或 firefox://extensions)
2. 開啟"開發者模式"
3. 點擊"加載未打包的擴展程序"
4. 選擇 `browser-extension` 目錄

### 2. 配置擴展
- 設置阻止級別 (嚴重、高風險、中等風險)
- 配置自動更新間隔
- 查看威脅統計和報告

## API 集成

擴展連接到 OraSRS 協議鏈的以下 API 端點：
- 威脅列表: `https://api.orasrs.net/orasrs/v2/threat-list`
- 風估查詢: `https://api.orasrs.net/orasrs/v1/query`

## 扩展文件结构

```
browser-extension/
├── manifest.json          # 擴展配置文件
├── background.js          # 背景腳本
├── src/
│   └── content.js         # 內容腳本
├── popup.html             # 彈出窗口界面
├── popup.js               # 彈出窗口邏輯
├── icons/                 # 擴展圖標
└── README.md              # 本說明文件
```

## 系统要求

- Chrome 88+ 或 Firefox 78+
- 互聯網連接以訪問 api.orasrs.net
- 遰機支持 JavaScript 執行

## 合規性

OraSRS Browser Extension 符合以下標準：
- GDPR (通用數據保護條例)
- CCPA (加州消費者隱私法)
- 中國網絡安全法
- 通過區塊鏈提供透明和可審計的威脅情報

## 安全特性

- 無數據外洩：所有處理都在本地進行
- 區塊鏈驗證：威脅情報經過鏈上驗證
- 防篡改：通過區塊鏈確保數據完整性
- 隱私保護：最小化數據收集和處理

## 版本信息

- 版本: 2.0.1
- 協議版本: OraSRS v2.0.1
- 支持三層架構: 邊緣層、共識層、智能層
- 集成去重邏輯防止重複威脅報告