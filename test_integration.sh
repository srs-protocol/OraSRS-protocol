#!/bin/bash
# 测试脚本：验证OraSRS威胁情报同步功能

echo "启动OraSRS客户端..."
cd /home/Great/SRS-Protocol/orasrs-threat-sync

# 在后台启动客户端并重定向输出到日志文件
node orasrs-client.js > client_output.log 2>&1 &

CLIENT_PID=$!
echo "客户端PID: $CLIENT_PID"

# 等待客户端启动
sleep 3

echo "运行模拟攻击脚本..."
cd /home/Great/SRS-Protocol
node simulate_attack.js

echo "等待事件传播..."
sleep 5

# 显示客户端日志中与威胁相关的内容
echo "=== 客户端输出中关于威胁的记录 ==="
grep -A5 -B5 -i "威胁\|block\|firewall\|iptables" /home/Great/SRS-Protocol/orasrs-threat-sync/client_output.log || echo "未在客户端日志中找到威胁相关记录"

# 结束客户端进程
kill $CLIENT_PID

echo "测试完成"