// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../contracts/OraSRSGovernance.sol";
import "../contracts/ThreatEvidence.sol";
import "../contracts/ThreatIntelligenceCoordination.sol";
import "../contracts/EnhancedThreatVerification.sol";
import "../contracts/PrivacyProtectedVerification.sol";
import "../contracts/VerifiableAuditTrail.sol";

contract OraSRSDeploymentScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署治理合约 (使用零地址作为timelock和威胁情报协调合约的临时地址)
        OraSRSGovernance governance = new OraSRSGovernance(address(0), address(0));
        console.log("Governance deployed at:", address(governance));

        // 部署威胁证据合约
        ThreatEvidence threatEvidence = new ThreatEvidence(address(governance));
        console.log("ThreatEvidence deployed at:", address(threatEvidence));

        // 重新部署治理合约，使用正确的威胁情报协调合约地址 (使用占位符，因为威胁情报协调合约需要先部署)
        // 实际部署时需要循环依赖处理
        
        // 部署威胁情报协调合约（现在只需要治理合约地址）
        ThreatIntelligenceCoordination threatIntelligence = new ThreatIntelligenceCoordination(
            address(governance)
        );
        console.log("ThreatIntelligenceCoordination deployed at:", address(threatIntelligence));
        
        // 重新部署治理合约以正确设置威胁情报协调合约地址
        governance = new OraSRSGovernance(address(0), address(threatIntelligence));
        console.log("Governance (updated) deployed at:", address(governance));

        // 重新部署威胁情报协调合约以使用新的治理合约地址
        threatIntelligence = new ThreatIntelligenceCoordination(
            address(governance)
        );
        console.log("ThreatIntelligenceCoordination (updated) deployed at:", address(threatIntelligence));

        // 部署增强威胁验证合约（需要治理合约地址和代币地址）
        // 由于 OraSRSToken 合约尚未部署，这里使用占位符地址，实际部署时需要调整顺序
        EnhancedThreatVerification enhancedVerification = new EnhancedThreatVerification(address(governance), address(0x0000000000000000000000000000000000000000));
        console.log("EnhancedThreatVerification deployed at:", address(enhancedVerification));

        // 部署隐私保护验证合约
        PrivacyProtectedVerification privacyVerification = new PrivacyProtectedVerification(address(governance));
        console.log("PrivacyProtectedVerification deployed at:", address(privacyVerification));

        // 部署可验证审计合约
        VerifiableAuditTrail auditTrail = new VerifiableAuditTrail(address(governance));
        console.log("VerifiableAuditTrail deployed at:", address(auditTrail));

        vm.stopBroadcast();
    }
}