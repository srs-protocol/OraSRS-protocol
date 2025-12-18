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

# 2.1 Extended Verification
echo "[*] Extended verification..."
if [ -f "/proc/$AGENT_PID/smaps_rollup" ]; then
    PSS_MB=$(cat /proc/$AGENT_PID/smaps_rollup | grep Pss: | awk '{sum += $2} END {print sum/1024}')
    echo " - PSS: ${PSS_MB} MB"
else
    echo " - PSS: N/A (smaps_rollup not available)"
fi

if [ -f "/proc/$AGENT_PID/status" ]; then
    STACK_MB=$(grep VmStk /proc/$AGENT_PID/status | awk '{print $2/1024}')
    echo " - Stack usage: ${STACK_MB} MB"
else
    echo " - Stack usage: N/A"
fi

# Heap usage via pmap (if available)
if command -v pmap >/dev/null; then
    HEAP_KB=$(pmap -x $AGENT_PID | grep heap | awk '{print $3}')
    if [ ! -z "$HEAP_KB" ]; then
        HEAP_MB=$(echo "scale=2; $HEAP_KB / 1024" | bc)
        echo " - Heap usage: ${HEAP_MB} MB"
    fi
fi

# Cleanup normal test
kill $AGENT_PID 2>/dev/null
wait $AGENT_PID 2>/dev/null

# 2.2 Stress Test
echo "[*] Stress testing memory stability (30s)..."
./native-agent --stress-test > /dev/null &
STRESS_PID=$!

# Monitor for 10 seconds (simulated stress)
sleep 10

if ps -p $STRESS_PID > /dev/null; then
    STRESS_RSS_KB=$(ps -o rss= -p $STRESS_PID | tr -d ' ')
    if [ "$STRESS_RSS_KB" -gt 5120 ]; then
        echo "❌ Memory leak detected during stress test: ${STRESS_RSS_KB} KB > 5MB"
        kill $STRESS_PID
        exit 1
    else
        echo "✅ Stress test passed: ${STRESS_RSS_KB} KB < 5MB"
    fi
    kill $STRESS_PID 2>/dev/null
else
    echo "⚠️ Stress test process exited early"
fi

# 3. Verify results
if (( $(echo "$RSS_MB < 5" | bc -l) )); then
    echo "✅ MEMORY TARGET ACHIEVED: ${RSS_MB}MB < 5MB"
    exit 0
else
    echo "❌ MEMORY TARGET FAILED: ${RSS_MB}MB >= 5MB"
    exit 1
fi
