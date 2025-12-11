// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ThreatEvidence.sol";

contract ThreatEvidenceTest is Test {
    ThreatEvidence public threatEvidence;
    address public governance;
    address public agent1;
    address public agent2;
    address public validator1;
    address public validator2;

    function setUp() public {
        governance = address(1);
        agent1 = address(2);
        agent2 = address(3);
        validator1 = address(4);
        validator2 = address(5);
        
        threatEvidence = new ThreatEvidence(governance);
        
        // 授权代理和验证器
        vm.prank(governance);
        threatEvidence.addAuthorizedAgent(agent1);
        
        vm.prank(governance);
        threatEvidence.addAuthorizedAgent(agent2);
        
        vm.prank(governance);
        threatEvidence.addAuthorizedValidator(validator1);
        
        vm.prank(governance);
        threatEvidence.addAuthorizedValidator(validator2);
    }

    function testContractInitialization() public {
        assertEq(threatEvidence.owner(), governance);
        assertEq(uint256(threatEvidence.contractState()), uint256(ThreatEvidence.ContractState.Active));
        
        // 验证治理委员会默认是验证器
        assertTrue(threatEvidence.authorizedValidators(governance));
    }

    function testSubmitThreatReport() public {
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData = ThreatEvidence.ThreatReportData({
            threatType: 0, // DDoS
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2, // Critical
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        vm.expectEmit(true, true, false, true);
        
        // 使用一个模拟的时间戳，因为我们无法精确预测时间
        vm.warp(1234567890);
        vm.prank(agent1);
        
        threatEvidence.submitThreatReport(reportData, 1);
        
        // 验证威胁报告是否被正确存储
        ThreatEvidence.ThreatAttestation memory report = threatEvidence.getThreatReport("threat_192.168.1.100_1234567890");
        assertEq(report.sourceIP, "192.168.1.100");
        assertEq(report.targetIP, "192.168.1.1");
        assertEq(uint256(report.threatType), 0);
        assertEq(uint256(report.threatLevel), 2);
        assertEq(report.context, "Multiple connection attempts detected");
        assertEq(report.evidenceHash, "ipfs://evidence123");
        assertEq(report.agentAddress, agent1);
        assertEq(report.verificationCount, 0);
        assertEq(report.verified, false);
    }

    function testVerifyThreatReport() public {
        // 首先提交一个威胁报告
        vm.warp(1234567890);
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData = ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        threatEvidence.submitThreatReport(reportData, 1);
        
        // 验证威胁报告
        vm.prank(validator1);
        threatEvidence.verifyThreatReport("threat_192.168.1.100_1234567890");
        
        ThreatEvidence.ThreatAttestation memory report = threatEvidence.getThreatReport("threat_192.168.1.100_1234567890");
        assertEq(report.verificationCount, 1);
        assertEq(report.verified, false); // 还没达到最小验证数
        
        // 再验证两次以达到最小验证数
        vm.prank(validator2);
        threatEvidence.verifyThreatReport("threat_192.168.1.100_1234567890");
        
        vm.prank(governance); // 治理委员会也是验证器
        threatEvidence.verifyThreatReport("threat_192.168.1.100_1234567890");
        
        report = threatEvidence.getThreatReport("threat_192.168.1.100_1234567890");
        assertEq(report.verificationCount, 3);
        assertTrue(report.verified);
    }

    function testRevokeThreatReport() public {
        // 提交威胁报告
        vm.warp(1234567890);
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData = ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        threatEvidence.submitThreatReport(reportData, 1);
        
        // 验证威胁报告存在
        assertTrue(threatEvidence.threatReportExists("threat_192.168.1.100_1234567890"));
        
        // 撤销威胁报告
        vm.prank(governance);
        vm.expectEmit(true, true, false, false);
        threatEvidence.revokeThreatReport("threat_192.168.1.100_1234567890", "False positive");
        
        // 验证威胁报告已被删除
        assertFalse(threatEvidence.threatReportExists("threat_192.168.1.100_1234567890"));
    }

    function testGetThreatsBySourceIP() public {
        // 提交多个来自同一IP的威胁报告
        vm.warp(1234567890);
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData1 = ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        threatEvidence.submitThreatReport(reportData1, 1);
        
        vm.warp(1234567891);
        vm.prank(agent2);
        
        ThreatEvidence.ThreatReportData memory reportData2 = ThreatEvidence.ThreatReportData({
            threatType: 1,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.2",
            threatLevel: 1,
            context: "Malware detected",
            evidenceHash: "ipfs://evidence456",
            geolocation: "US-NY"
        });
        
        threatEvidence.submitThreatReport(reportData2, 1);
        
        // 获取特定IP的威胁报告
        string[] memory threats = threatEvidence.getThreatsBySourceIP("192.168.1.100");
        assertEq(threats.length, 2);
        assertEq(threats[0], "threat_192.168.1.100_1234567890");
        assertEq(threats[1], "threat_192.168.1.100_1234567891");
    }

    function testGetThreatCountByType() public {
        // 提交不同类型的威胁报告
        vm.warp(1234567890);
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData1 = ThreatEvidence.ThreatReportData({
            threatType: 0, // DDoS
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        threatEvidence.submitThreatReport(reportData1, 1);
        
        vm.warp(1234567891);
        vm.prank(agent2);
        
        ThreatEvidence.ThreatReportData memory reportData2 = ThreatEvidence.ThreatReportData({
            threatType: 1, // Malware
            sourceIP: "192.168.1.101",
            targetIP: "192.168.1.2",
            threatLevel: 1,
            context: "Malware detected",
            evidenceHash: "ipfs://evidence456",
            geolocation: "US-NY"
        });
        
        threatEvidence.submitThreatReport(reportData2, 2);
        
        vm.warp(1234567892);
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData3 = ThreatEvidence.ThreatReportData({
            threatType: 1, // Malware
            sourceIP: "192.168.1.102",
            targetIP: "192.168.1.3",
            threatLevel: 3,
            context: "Advanced malware detected",
            evidenceHash: "ipfs://evidence789",
            geolocation: "US-TX"
        });
        
        threatEvidence.submitThreatReport(reportData3, 3);
        
        // 验证威胁类型统计
        assertEq(threatEvidence.getThreatCountByType(ThreatEvidence.ThreatType.DDoS), 1);
        assertEq(threatEvidence.getThreatCountByType(ThreatEvidence.ThreatType.Malware), 2);
        assertEq(threatEvidence.getThreatCountByType(ThreatEvidence.ThreatType.Phishing), 0);
    }

    function testAccessControl() public {
        // 测试非授权代理无法提交威胁报告
        vm.expectRevert("Only authorized agents can call this function");
        threatEvidence.submitThreatReport(ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Test",
            evidenceHash: "hash",
            geolocation: "US"
        }), 1);
        
        // 测试非授权验证器无法验证威胁报告
        vm.expectRevert("Only authorized validators can call this function");
        threatEvidence.verifyThreatReport("fake_id");
        
        // 测试非治理地址无法撤销威胁报告
        vm.expectRevert("Only governance can call this function");
        threatEvidence.revokeThreatReport("fake_id", "reason");
    }

    function testContractPause() public {
        // 暂停合约
        vm.prank(governance);
        threatEvidence.pauseContract();
        
        assertEq(uint256(threatEvidence.contractState()), uint256(ThreatEvidence.ContractState.Paused));
        
        // 验证暂停后无法提交威胁报告
        vm.prank(agent1);
        vm.expectRevert("Contract is not active");
        threatEvidence.submitThreatReport(ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Test",
            evidenceHash: "hash",
            geolocation: "US"
        }), 1);
        
        // 恢复合约
        vm.prank(governance);
        threatEvidence.resumeContract();
        
        assertEq(uint256(threatEvidence.contractState()), uint256(ThreatEvidence.ContractState.Active));
    }

    function testReplayAttackProtection() public {
        vm.warp(1234567890);
        vm.prank(agent1);
        
        ThreatEvidence.ThreatReportData memory reportData = ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        // 第一次提交应该成功
        threatEvidence.submitThreatReport(reportData, 1);
        
        // 使用相同的nonce再次提交应该失败
        vm.expectRevert("Nonce already used");
        threatEvidence.submitThreatReport(reportData, 1);
    }
}