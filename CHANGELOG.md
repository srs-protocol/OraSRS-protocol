# Changelog

All notable changes to this project will be documented in this file.

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
