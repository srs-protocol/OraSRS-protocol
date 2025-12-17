# Changelog

All notable changes to this project will be documented in this file.

## [v3.3.0] - 2025-12-18

### Added - Hardhat Service Daemon
- **Hardhat**: Enhanced systemd service with intelligent restart strategy
- **Hardhat**: Health monitoring daemon with automatic recovery (`hardhat-health-monitor.sh`)
- **Hardhat**: Exponential backoff retry logic (10s → 20s → 40s → 60s → 300s)
- **Hardhat**: One-click deployment script (`deploy-hardhat-daemon.sh`)
- **Hardhat**: Comprehensive management commands (monitor, health-check, etc.)
- **Hardhat**: Resource limits (2GB memory, 200% CPU quota)
- **Docs**: Complete Hardhat daemon guide (`HARDHAT_DAEMON_GUIDE.md`)

### Added - OpenWrt T3 Module Optimization
- **OpenWrt**: Multi-endpoint blockchain support with automatic failover
- **OpenWrt**: Three-tier fallback strategy (Blockchain → Public Feeds → Cache)
- **OpenWrt**: Exponential backoff retry logic for sync operations
- **OpenWrt**: Offline mode with local SQLite cache (24-hour TTL)
- **OpenWrt**: Public threat feed integration (Feodo Tracker, EmergingThreats)
- **OpenWrt**: Automated deployment script (`deploy-openwrt-t3.sh`)
- **OpenWrt**: Comprehensive test suite (`test-openwrt-t3.sh`)
- **Docs**: T3 optimization technical documentation (`OPENWRT_T3_OPTIMIZATION.md`)
- **Docs**: Step-by-step deployment guide (`OPENWRT_DEPLOYMENT_GUIDE.md`)
- **Docs**: Quick reference card (`QUICK_DEPLOY_REFERENCE.md`)

### Changed
- **Hardhat**: Upgraded `hardhat-node.service` with smart restart and health checks
- **Hardhat**: Enhanced `manage-hardhat-service.sh` with monitoring management
- **OpenWrt**: Complete overhaul of sync logic in `orasrs-lite.js`
- **OpenWrt**: Added `blockchainEndpoints` and `offlineMode` configuration options

### Performance
- **Hardhat**: Stable operation for 12+ hours with zero restarts
- **OpenWrt**: Sync time 2-5s (blockchain), 5-10s (public feeds)
- **OpenWrt**: Memory footprint < 10 MB, disk usage < 5 MB

### Testing
- ✅ Hardhat auto-restart and health monitoring verified
- ✅ OpenWrt multi-endpoint failover tested
- ✅ Public feed fallback validated
- ✅ Offline mode functional
- ✅ Cache persistence confirmed

## [v3.2.0] - 2025-12-17

### Added
- **OpenWrt**: Native `nftables` support with automatic backend detection.
- **OpenWrt**: Lightweight LuCI web interface for visual management.
- **Linux**: Unified installer supporting Edge, Hybrid, and Full modes.
- **Core**: Atomic rule updates (`ipset swap` / `nft -f`) to prevent protection gaps.
- **Core**: Built-in SYN Flood protection (Limit: 20/s, Burst: 50).
- **Core**: `orasrs-cli harden` command for emergency response (Limit: 5/s).
- **Core**: File locking (`flock`) to prevent race conditions.
- **Docs**: PoC Defense Report v2.0 (17M packet DDoS defense).
- **Docs**: IETF Internet-Draft citation in README.

### Changed
- **OpenWrt**: Upgraded `install-openwrt.sh` to v3.2.0.
- **Linux**: Upgraded `install.sh` to v3.2.0.
- **Core**: Improved service reliability with watchdog and systemd/procd integration.

## [v3.1.0] - 2025-12-17

### Added
- **OpenWrt**: Atomic updates and concurrency locking.
- **OpenWrt**: Dynamic hardening commands.

## [v3.0.3] - 2025-12-17

### Added
- **OpenWrt**: Initial SYN Flood protection rules.

## [v3.0.2] - 2025-12-16

### Added
- **OpenWrt**: Intelligent hardware detection and multi-mode selection.
