// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/ThreatEvidence.sol";
import "../contracts/ThreatIntelligenceCoordination.sol";
import "../contracts/OraSRSGovernance.sol";

contract DeployOraSRS is Script {
    function run() external {
        vm.startBroadcast();
        
        // 部署威胁证据合约
        ThreatEvidence threatEvidence = new ThreatEvidence(msg.sender);
        console.log("ThreatEvidence deployed at:", address(threatEvidence));
        
        // 部署威胁情报协调合约（已移除质押功能，放宽节点注册条件）
        ThreatIntelligenceCoordination threatIntelCoord = new ThreatIntelligenceCoordination(
            msg.sender
        );
        console.log("ThreatIntelligenceCoordination deployed at:", address(threatIntelCoord));
        
        // 部署治理合约（已设置更宽松的治理参数）
        OraSRSGovernance governance = new OraSRSGovernance(
            msg.sender,
            address(threatIntelCoord)
        );
        console.log("OraSRSGovernance deployed at:", address(governance));
        
        vm.stopBroadcast();
    }
}