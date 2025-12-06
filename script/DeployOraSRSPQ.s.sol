// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/ThreatEvidencePQ.sol";
import "../contracts/ThreatIntelligenceCoordinationPQ.sol";

contract DeployOraSRSPQ is Script {
    function setUp() public pure {
        // 设置部署前的准备工作
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署治理合约地址（模拟）
        address governanceAddr = address(0x1234567890123456789012345678901234567890);
        
        // 部署抗量子威胁证据合约
        ThreatEvidencePQ threatEvidencePQ = new ThreatEvidencePQ(governanceAddr);
        console.log("ThreatEvidencePQ deployed at:", address(threatEvidencePQ));
        
        // 部署抗量子威胁情报协调合约
        ThreatIntelligenceCoordinationPQ threatIntelPQ = new ThreatIntelligenceCoordinationPQ(
            governanceAddr,
            address(threatEvidencePQ)
        );
        console.log("ThreatIntelligenceCoordinationPQ deployed at:", address(threatIntelPQ));
        
        vm.stopBroadcast();
        
        // 输出部署信息
        console.log("=== OraSRS Protocol Network Deployment (Post-Quantum) ===");
        console.log("ThreatEvidencePQ:", address(threatEvidencePQ));
        console.log("ThreatIntelligenceCoordinationPQ:", address(threatIntelPQ));
        console.log("Governance Address:", governanceAddr);
        console.log("=========================================");
    }
}