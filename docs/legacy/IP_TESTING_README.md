# OraSRS 客户端IP查询性能测试

这个测试套件用于测试OraSRS协议客户端的IP查询性能，包括本地查询和链上数据查询。

## 测试脚本说明

### 1. test-ip-performance-advanced.js
主测试脚本，执行完整的性能测试：

- 生成10,000个本地IP进行查询测试
- 生成1,000个链上威胁情报数据
- 执行单个IP查询性能测试
- 执行批量IP查询性能测试
- 生成详细的性能测试报告

### 2. test-client-api.js
API服务脚本，提供模拟的OraSRS客户端API接口：

- `/SRA/v1/query?ip=x.x.x.x` - 查询单个IP威胁情报
- `/SRA/v1/bulk-query` - 批量查询IP威胁情报
- `/SRA/v2/threat-list` - 获取全局威胁列表
- `/test/performance` - 性能测试端点

### 3. test-ip-performance.js
基础性能测试脚本，生成IP列表和威胁数据。

## 运行测试

### 运行高级性能测试
```bash
node test-ip-performance-advanced.js
```

### 运行API服务
```bash
node test-client-api.js
```

然后可以通过以下方式访问API：
```bash
# 查询单个IP
curl "http://localhost:3000/SRA/v1/query?ip=1.2.3.4"

# 批量查询
curl -X POST http://localhost:3000/SRA/v1/bulk-query -H "Content-Type: application/json" -d '{"ips":["1.2.3.4","5.6.7.8"]}'

# 获取威胁列表
curl "http://localhost:3000/SRA/v2/threat-list"

# 性能测试
curl "http://localhost:3000/test/performance?ipCount=1000"
```

## 测试结果

测试完成后会生成以下文件：

- `oraSRS-client-performance-report.json` - 详细的性能测试报告
- `test-ip-list.json` - 测试使用的IP列表
- `ip-performance-test-report.json` - 基础测试报告
- `local-ip-list.json` - 本地IP列表
- `chain-threat-data.json` - 链上威胁数据

## 测试内容

- **本地查询性能**: 测试本地威胁情报查询速度
- **批量查询性能**: 测试批量IP查询效率
- **缓存统计**: 统计缓存命中率和效率
- **威胁列表统计**: 统计高、中、低风险IP数量
- **QPS指标**: 每秒查询率

## 配置参数

测试脚本包含以下可配置参数：

- `localIPCount`: 本地IP数量（默认10000）
- `chainIPCount`: 链上IP数量（默认1000）
- `cache.maxSize`: 本地缓存最大大小
- `cache.ttl`: 缓存生存时间（毫秒）
- `thresholds`: 风险评分阈值（低、中、高）

## 注意事项

- 这是一个模拟测试，不涉及真实的风控操作
- 所有数据都是随机生成的模拟数据
- 测试结果仅供参考，实际性能可能因环境而异