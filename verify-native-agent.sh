#!/bin/bash
# verify-native-agent.sh - Strictly verify memory commitment

echo "=== OraSRS Native Agent Memory Verification ==="

# 1. Build native agent
echo "[*] Building native agent..."
cd src/agent
if ! make native-agent; then
    echo "❌ Build failed"
    exit 1
fi

# 2. Measure memory
echo "[*] Measuring memory footprint..."
./native-agent --test-mode > /dev/null &
AGENT_PID=$!

# Wait for process to initialize
sleep 1

if ! ps -p $AGENT_PID > /dev/null; then
    echo "❌ Agent failed to start"
    exit 1
fi

# RSS (Resident Set Size) - Real physical memory
RSS_KB=$(ps -o rss= -p $AGENT_PID | tr -d ' ')
RSS_MB=$(echo "scale=2; $RSS_KB / 1024" | bc)

echo "PID: $AGENT_PID"
echo "RSS: ${RSS_MB} MB"

# Cleanup
kill $AGENT_PID 2>/dev/null
wait $AGENT_PID 2>/dev/null

# 3. Verify results
if (( $(echo "$RSS_MB < 5" | bc -l) )); then
    echo "✅ MEMORY TARGET ACHIEVED: ${RSS_MB}MB < 5MB"
    exit 0
else
    echo "❌ MEMORY TARGET FAILED: ${RSS_MB}MB >= 5MB"
    exit 1
fi
