// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ThreatReport
 * @dev Allows community members to report threat IPs.
 *      These reports are aggregated by the Oracle to form "Community Consensus".
 */
contract ThreatReport {
    struct Report {
        address reporter;
        uint256 timestamp;
        string reason;
        bytes signature; // Signature of (ip, reason, timestamp) signed by reporter
    }

    // IP string -> List of reports
    mapping(string => Report[]) public reports;
    
    // IP string -> Reporter address -> bool (prevent duplicate reports from same address)
    mapping(string => mapping(address => bool)) public hasReported;

    // Event emitted when a threat is reported
    event ThreatReported(address indexed reporter, string ip, string reason, uint256 timestamp);

    /**
     * @dev Submit a threat report.
     * @param ip The IP address being reported.
     * @param reason The reason for reporting (e.g., "C2", "Phishing").
     * @param signature Optional ECDSA signature for off-chain verification.
     */
    function reportThreat(string memory ip, string memory reason, bytes memory signature) public {
        require(!hasReported[ip][msg.sender], "You have already reported this IP");
        require(bytes(ip).length > 0, "IP cannot be empty");

        reports[ip].push(Report({
            reporter: msg.sender,
            timestamp: block.timestamp,
            reason: reason,
            signature: signature
        }));

        hasReported[ip][msg.sender] = true;

        emit ThreatReported(msg.sender, ip, reason, block.timestamp);
    }

    /**
     * @dev Get the number of unique reporters for an IP.
     */
    function getReportCount(string memory ip) public view returns (uint256) {
        return reports[ip].length;
    }
    
    /**
     * @dev Get all reports for an IP.
     */
    function getReports(string memory ip) public view returns (Report[] memory) {
        return reports[ip];
    }
}
