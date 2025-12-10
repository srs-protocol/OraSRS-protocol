// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/IPRiskCalculator.sol";
import "../contracts/ThreatStats.sol";
import "../contracts/OraSRSReader.sol";
import "../contracts/ThreatIntelligenceCoordination.sol";

contract DeploySecurityContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 首先部署威胁情报协调合约（作为数据源）
        ThreatIntelligenceCoordination threatIntelligence = new ThreatIntelligenceCoordination();
        console.log("ThreatIntelligenceCoordination deployed at:", address(threatIntelligence));
        
        // 部署IP风险计算器
        IPRiskCalculator riskCalculator = new IPRiskCalculator();
        console.log("IPRiskCalculator deployed at:", address(riskCalculator));
        
        // 部署威胁态势分析合约
        ThreatStats threatStats = new ThreatStats();
        console.log("ThreatStats deployed at:", address(threatStats));
        
        // 部署批量查询合约，使用威胁情报协调合约和风险计算器
        OraSRSReader reader = new OraSRSReader(
            address(threatIntelligence),  // 使用威胁情报协调合约（实现getThreatScore接口）
            address(riskCalculator)       // 使用风险计算器合约
        );
        console.log("OraSRSReader deployed at:", address(reader));
        
        vm.stopBroadcast();
    }
}