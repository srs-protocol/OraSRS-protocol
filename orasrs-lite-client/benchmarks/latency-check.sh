#!/bin/bash
# latency-check.sh
# 延迟检查脚本 - 测试OraSRS API响应延迟

echo "OraSRS Lite Client 延迟检查"
echo "=========================="

# 默认API端点
API_ENDPOINT="${1:-https://api.orasrs.net}"

# 测试查询IP
TEST_IP="8.8.8.8"

echo "测试API端点: $API_ENDPOINT"
echo "测试IP: $TEST_IP"
echo "开始延迟测试..."

# 使用curl进行延迟测试
echo ""
echo "1. HTTP连接延迟测试:"

for i in {1..5}; do
    latency=$(curl -o /dev/null -s -w "%{time_total}" $API_ENDPOINT/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        latency_ms=$(echo "$latency * 1000" | bc -l | cut -d. -f1)
        echo "   请求 $i: ${latency_ms}ms"
        latencies+=($latency_ms)
    else
        echo "   请求 $i: 超时或错误"
        latencies+=(0)
    fi
    sleep 1
done

# 计算平均延迟
sum=0
valid_count=0
for latency in "${latencies[@]}"; do
    if [ $latency -gt 0 ]; then
        sum=$((sum + latency))
        valid_count=$((valid_count + 1))
    fi
done

if [ $valid_count -gt 0 ]; then
    avg_latency=$((sum / valid_count))
    echo ""
    echo "平均延迟: ${avg_latency}ms"
else
    echo ""
    echo "无法获取有效延迟数据"
    avg_latency=0
fi

# 威胁情报查询延迟测试
echo ""
echo "2. 威胁情报查询延迟测试:"

query_latencies=()
for i in {1..3}; do
    start_time=$(date +%s%3N)
    
    # 执行威胁情报查询
    response=$(curl -s "$API_ENDPOINT/orasrs/v1/query?ip=$TEST_IP" -H "Content-Type: application/json" 2>/dev/null)
    
    end_time=$(date +%s%3N)
    query_latency=$((end_time - start_time))
    
    echo "   查询 $i: ${query_latency}ms"
    query_latencies+=($query_latency)
    sleep 1
done

# 计算平均查询延迟
sum=0
for latency in "${query_latencies[@]}"; do
    sum=$((sum + latency))
done

if [ ${#query_latencies[@]} -gt 0 ]; then
    avg_query_latency=$((sum / ${#query_latencies[@]}))
    echo ""
    echo "平均查询延迟: ${avg_query_latency}ms"
else
    echo ""
    echo "无法获取有效查询延迟数据"
    avg_query_latency=0
fi

# 性能评估
echo ""
echo "3. 性能评估:"

if [ $avg_latency -le 100 ] && [ $avg_query_latency -le 200 ]; then
    echo "   ⭐ 性能优秀 - 延迟低于阈值"
    performance="excellent"
elif [ $avg_latency -le 300 ] && [ $avg_query_latency -le 500 ]; then
    echo "   ⭐⭐ 性能良好 - 延迟在可接受范围内"
    performance="good"
elif [ $avg_latency -le 1000 ] && [ $avg_query_latency -le 1000 ]; then
    echo "   ⚠️  性能一般 - 延迟较高"
    performance="average"
else
    echo "   ❌ 性能较差 - 延迟过高"
    performance="poor"
fi

# 生成测试报告
REPORT_DIR="../logs/hybrid-cloud-test-results"
mkdir -p $REPORT_DIR

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$REPORT_DIR/latency-test-$TIMESTAMP.json"

cat << EOF > $REPORT_FILE
{
  "testName": "latency-check",
  "timestamp": "$(date -Iseconds)",
  "apiEndpoint": "$API_ENDPOINT",
  "testIP": "$TEST_IP",
  "results": {
    "httpLatency": {
      "average": $avg_latency,
      "unit": "ms"
    },
    "queryLatency": {
      "average": $avg_query_latency,
      "unit": "ms"
    }
  },
  "performance": "$performance",
  "summary": "OraSRS API延迟测试结果"
}
EOF

echo ""
echo "测试完成！"
echo "详细报告已保存至: $REPORT_FILE"

# 输出简要摘要
echo ""
echo "=== 测试摘要 ==="
echo "HTTP平均延迟: ${avg_latency}ms"
echo "查询平均延迟: ${avg_query_latency}ms"
echo "性能评级: $performance"
echo "报告文件: $REPORT_FILE"