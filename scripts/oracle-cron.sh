#!/bin/bash
# OraSRS Oracle Cron Job Script
# Runs daily at midnight to update threat intelligence data

# Configuration
ORACLE_DIR="/home/Great/SRS-Protocol/oracle"
LOG_FILE="/var/log/orasrs-oracle.log"
PYTHON_BIN="/usr/bin/python3"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Log start time
echo "=== OraSRS Oracle Update - $(date) ===" >> "$LOG_FILE"

# Change to oracle directory
cd "$ORACLE_DIR" || exit 1

# Run oracle script
$PYTHON_BIN threat_oracle.py >> "$LOG_FILE" 2>&1

# Check exit status
if [ $? -eq 0 ]; then
    echo "✅ Oracle update completed successfully" >> "$LOG_FILE"
else
    echo "❌ Oracle update failed with exit code $?" >> "$LOG_FILE"
fi

# Log completion
echo "=== Completed at $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Keep only last 30 days of logs
find "$(dirname "$LOG_FILE")" -name "$(basename "$LOG_FILE")" -mtime +30 -delete 2>/dev/null
