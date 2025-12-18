// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OptimizedThreatRegistry
 * @dev Gas-optimized threat registry using bytes4 for IPv4 and packed storage slots.
 */
contract OptimizedThreatRegistry is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // Packed struct to fit in a single 256-bit storage slot
    // expiry (64) + riskLevel (8) + mask (8) + sourceMask (16) = 96 bits < 256 bits
    struct ThreatInfo {
        uint64 expiry;      // Timestamp when the threat expires
        uint8 riskLevel;    // 0=Safe, 1=Low, 2=Medium, 3=High, 4=Critical
        uint8 mask;         // CIDR mask (e.g., 32 for single IP)
        uint16 sourceMask;  // Bitmask of sources (e.g., bit 0 = Spamhaus, bit 1 = DShield)
    }

    // Mapping from IPv4 (bytes4) to ThreatInfo
    mapping(bytes4 => ThreatInfo) public threats;

    event ThreatUpdated(bytes4 indexed ip, uint8 riskLevel, uint64 expiry, uint8 mask);
    event ThreatRemoved(bytes4 indexed ip);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    /**
     * @dev Batch update threat intelligence.
     * @param ips Array of IPv4 addresses in bytes4 format.
     * @param levels Array of risk levels.
     * @param masks Array of CIDR masks.
     * @param sources Array of source bitmasks.
     * @param duration Duration in seconds for new threats.
     */
    function updateThreatBatch(
        bytes4[] calldata ips,
        uint8[] calldata levels,
        uint8[] calldata masks,
        uint16[] calldata sources,
        uint64 duration
    ) external onlyRole(ORACLE_ROLE) {
        require(ips.length == levels.length && ips.length == masks.length && ips.length == sources.length, "Length mismatch");

        for (uint256 i = 0; i < ips.length; i++) {
            bytes4 ip = ips[i];
            uint8 level = levels[i];
            
            // If level is 0, remove the threat (gas refund)
            if (level == 0) {
                delete threats[ip];
                emit ThreatRemoved(ip);
                continue;
            }

            ThreatInfo storage info = threats[ip];
            uint64 newExpiry;

            // Dynamic Stacking Logic
            // If IP exists, is active (expiry > now), and is High/Critical (>=3)
            if (info.expiry > block.timestamp && info.riskLevel >= 3) {
                // Stack 7 days
                newExpiry = info.expiry + 7 days;
            } else {
                // New threat or expired or low risk
                newExpiry = uint64(block.timestamp + duration);
            }

            // Update storage
            info.expiry = newExpiry;
            info.riskLevel = level;
            info.mask = masks[i];
            info.sourceMask = sources[i];

            emit ThreatUpdated(ip, level, newExpiry, masks[i]);
        }
    }

    /**
     * @dev Get threat info for an IP.
     * @param ip IPv4 address in bytes4.
     */
    function getThreat(bytes4 ip) external view returns (ThreatInfo memory) {
        return threats[ip];
    }

    /**
     * @dev Check if an IP is currently a threat.
     * @param ip IPv4 address in bytes4.
     */
    function isThreat(bytes4 ip) external view returns (bool, uint8, uint64) {
        ThreatInfo memory info = threats[ip];
        if (info.expiry > block.timestamp && info.riskLevel > 0) {
            return (true, info.riskLevel, info.expiry);
        }
        return (false, 0, 0);
    }

    // Merkle Root for Light Client verification
    bytes32 public merkleRoot;
    event MerkleRootUpdated(bytes32 indexed root, uint256 timestamp);

    /**
     * @dev Update the Merkle Root of the threat list.
     * @param _root New Merkle Root.
     */
    function updateMerkleRoot(bytes32 _root) external onlyRole(ORACLE_ROLE) {
        merkleRoot = _root;
        emit MerkleRootUpdated(_root, block.timestamp);
    }

    /**
     * @dev Prune expired IPs to free up storage.
     * @param ips Array of IPs to check and prune.
     */
    function pruneExpired(bytes4[] calldata ips) external {
        for (uint256 i = 0; i < ips.length; i++) {
            if (threats[ips[i]].expiry <= block.timestamp && threats[ips[i]].expiry != 0) {
                delete threats[ips[i]];
                emit ThreatRemoved(ips[i]);
            }
        }
    }
}
