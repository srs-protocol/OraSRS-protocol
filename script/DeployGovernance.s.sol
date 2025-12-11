// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/OraSRSGovernance.sol";
import "../contracts/OraSRSToken.sol";
import "../contracts/ThreatIntelligenceCoordination.sol";

contract GovernanceDeploymentScript is Script {
    function run() external {
        // 从环境变量获取私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署OraSRSGovernance合约
        // 使用零地址作为timelock和威胁情报协调合约的临时地址，后续可以更新
        OraSRSGovernance governance = new OraSRSGovernance(
            address(0), // timelock
            address(0)  // threatIntelligenceCoordination
        );
        
        console.log("OraSRSGovernance 合约部署地址:", address(governance));
        console.log("部署完成！治理合约现在可以管理OraSRS协议的关键功能。");
        
        vm.stopBroadcast();
    }
}