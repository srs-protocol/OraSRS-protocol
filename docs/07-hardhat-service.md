# Hardhat Service Daemon Deployment Guide

> 🇨🇳 **中文用户：[点击这里查看中文文档 (Chinese Documentation)](./07-hardhat-service_zh-CN.md)**

## Overview

A complete daemon solution has been created for the OraSRS local Hardhat blockchain node, including:

1. **Enhanced systemd Service** - Automatic restart and resource management.
2. **Health Monitor Daemon** - Proactive monitoring and intelligent recovery.
3. **Exponential Backoff Retry** - Prevents frequent service restarts.
4. **Complete Management Tools** - Simplifies operations.

## Core Features

### 1. Automatic Restart Strategy

**systemd Configuration** (`hardhat-node.service`):
- ✅ Auto-restart after service crash.
- ✅ Exponential backoff delay: 10s → 20s → 40s → 60s (Max).
- ✅ Max 5 restarts in 5 minutes (prevents restart loops).
- ✅ Resource limits: 2GB Memory, 200% CPU.

### 2. Health Monitoring

**Monitor Daemon** (`hardhat-health-monitor.sh`):
- ✅ Checks service health every 30 seconds.
- ✅ RPC endpoint responsiveness detection.
- ✅ Automatically restarts failed services.
- ✅ Detailed logging to `/var/log/hardhat-monitor.log`.

### 3. Intelligent Retry Logic

**Exponential Backoff Algorithm**:
```
Retry 0: Immediate restart
Retry 1: Wait 10 seconds
Retry 2: Wait 20 seconds
Retry 3: Wait 40 seconds
Retry 4+: Wait 60 seconds (Max)
```

## Quick Start

### One-Click Deployment

```bash
# Automatically install and start all services
sudo bash /home/Great/SRS-Protocol/deploy-hardhat-daemon.sh
```

### Manual Deployment

```bash
# 1. Install Service
sudo bash /home/Great/SRS-Protocol/manage-hardhat-service.sh install

# 2. Start Hardhat Node
sudo systemctl start hardhat-node

# 3. Start Health Monitor
sudo systemctl start hardhat-health-monitor

# 4. Check Status
sudo systemctl status hardhat-node
sudo systemctl status hardhat-health-monitor
```

## Management Commands

### Hardhat Node Service

```bash
# Start Service
sudo systemctl start hardhat-node

# Stop Service
sudo systemctl stop hardhat-node

# Restart Service
sudo systemctl restart hardhat-node

# View Status
sudo systemctl status hardhat-node

# View Logs
sudo journalctl -u hardhat-node -f

# View last 50 lines of logs
sudo journalctl -u hardhat-node -n 50
```

### Health Monitor Service

```bash
# Start Monitor
sudo bash manage-hardhat-service.sh monitor

# Stop Monitor
sudo bash manage-hardhat-service.sh monitor-stop

# View Monitor Status
sudo bash manage-hardhat-service.sh monitor-status

# Execute Health Check
sudo bash manage-hardhat-service.sh health-check

# View Monitor Logs
sudo tail -f /var/log/hardhat-monitor.log
```

### Test Automatic Restart

```bash
# Test auto-restart function
sudo bash manage-hardhat-service.sh test-restart
```

## Health Check Mechanism

### Check Items

1. **Service Status Check**
   - Verify systemd service is running.
   - Check if process is alive.

2. **RPC Response Check**
   - Call `eth_blockNumber` method.
   - Verify JSON-RPC response.
   - 5-second timeout limit.

3. **Comprehensive Health Assessment**
   - Combine service status and RPC response.
   - Consecutive failure count.
   - Trigger auto-restart.

### Health Check Log Example

```
2025-12-18 02:48:00 [INFO] Hardhat Health Monitor Started
2025-12-18 02:48:00 [INFO] Check Interval: 30s
2025-12-18 02:48:00 [INFO] RPC Endpoint: http://127.0.0.1:8545
2025-12-18 02:48:30 [INFO] Service Running Normally (Total Restarts: 0)
2025-12-18 02:49:00 [ERROR] Health Check Failed (Consecutive Failures: 1)
2025-12-18 02:49:00 [WARNING] Preparing to Restart Hardhat Service (Retry: 1, Delay: 10s)
2025-12-18 02:49:10 [SUCCESS] Hardhat Service Restarted Successfully
2025-12-18 02:49:20 [SUCCESS] Hardhat Service Health Check Passed
```

## File Structure

```
/home/Great/SRS-Protocol/
├── hardhat-node.service              # systemd service config
├── hardhat-health-monitor.service    # monitor service config
├── hardhat-health-monitor.sh         # health monitor daemon
├── manage-hardhat-service.sh         # service management script
├── deploy-hardhat-daemon.sh          # one-click deployment script
└── start-secure-hardhat-node.sh      # secure start script (legacy)

/etc/systemd/system/
├── hardhat-node.service              # installed service
└── hardhat-health-monitor.service    # installed monitor service

/var/log/
└── hardhat-monitor.log               # monitor log

/var/run/
└── hardhat-monitor.pid               # monitor process PID
```

## Configuration

### systemd Service Configuration

**Key Parameters**:
- `Restart=always` - Always auto-restart.
- `RestartSec=10` - Initial restart delay 10s.
- `StartLimitInterval=300` - 5-minute window.
- `StartLimitBurst=5` - Max 5 restarts.
- `MemoryMax=2G` - Max memory limit.
- `CPUQuota=200%` - CPU quota (2 cores).

### Monitor Configuration

**Tunable Parameters** (in `hardhat-health-monitor.sh`):
```bash
CHECK_INTERVAL=30          # Health check interval (seconds)
MAX_RETRY_DELAY=300        # Max retry delay (seconds)
INITIAL_RETRY_DELAY=10     # Initial retry delay (seconds)
```

## Troubleshooting

### Service Fails to Start

```bash
# View detailed error logs
sudo journalctl -u hardhat-node -n 50 --no-pager

# Check port usage
sudo lsof -i :8545

# Manual start test
cd /home/Great/SRS-Protocol
npx hardhat node --hostname 127.0.0.1 --port 8545
```

### Monitor Service Abnormal

```bash
# View monitor logs
sudo tail -100 /var/log/hardhat-monitor.log

# Manual health check
sudo bash hardhat-health-monitor.sh test

# Restart monitor service
sudo systemctl restart hardhat-health-monitor
```

### Frequent Restarts

If the service restarts frequently, check:
1. System resources (Memory, CPU).
2. Node.js version compatibility.
3. Hardhat configuration.
4. Network port conflicts.

```bash
# Check system resources
free -h
top -bn1 | head -20

# Check Node.js version
node --version

# Check config file
cat hardhat.config.cjs
```

## Performance Optimization

### Adjust Resource Limits

If you need to adjust resource limits, edit `hardhat-node.service`:

```ini
# Increase memory limit to 4GB
MemoryMax=4G

# Increase CPU quota to 4 cores
CPUQuota=400%
```

Then reload configuration:
```bash
sudo systemctl daemon-reload
sudo systemctl restart hardhat-node
```

### Adjust Monitor Interval

Edit `hardhat-health-monitor.sh`:
```bash
# Reduce interval to 15s (More sensitive)
CHECK_INTERVAL=15

# Or increase to 60s (Reduce overhead)
CHECK_INTERVAL=60
```

## Security Recommendations

1. **Listen on Localhost Only** - Bind Hardhat node to `127.0.0.1`, do not expose to public internet.
2. **Log Rotation** - Configure logrotate to prevent large log files.
3. **Resource Limits** - systemd limits memory and CPU usage.
4. **Access Control** - Service runs as root (dedicated user recommended for production).

## Next Steps

- [ ] Configure log rotation (`/etc/logrotate.d/hardhat`)
- [ ] Add alert notifications (Email/Webhook)
- [ ] Integrate Prometheus monitoring
- [ ] Create backup scripts

## Related Documentation

- [Hardhat Official Documentation](https://hardhat.org/)
- [systemd Service Management](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
- [OraSRS Protocol Documentation](../README.md)
