// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ThreatIntelligenceCoordination.sol";
import "../contracts/ThreatEvidence.sol";
import "../contracts/OraSRSGovernance.sol";

contract ThreatIntelligenceCoordinationTest is Test {
    ThreatIntelligenceCoordination public coordination;
    address public governanceAddr;
    address public threatEvidenceAddr;
    address public node1;
    address public node2;
    address public unauthorizedNode;

    function setUp() public {
        governanceAddr = address(1);
        threatEvidenceAddr = address(2);
        node1 = address(3);
        node2 = address(4);
        unauthorizedNode = address(5);
        
        coordination = new ThreatIntelligenceCoordination(governanceAddr, threatEvidenceAddr);
    }

    function testContractInitialization() public {
        assertEq(coordination.owner(), address(this));
        assertEq(coordination.governanceContract(), governanceAddr);
        assertEq(coordination.threatEvidenceContract(), threatEvidenceAddr);
        assertEq(uint256(coordination.contractState()), uint256(ThreatIntelligenceCoordination.ContractState.Active));
        
        // 验证治理节点初始信誉
        (, , , , uint256 reputationScore, , bool isActive, , ) = coordination.getNodeReputation(governanceAddr);
        
        assertEq(reputationScore, 1000);
        assertTrue(isActive);
    }

    function testNodeRegistration() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        (
            uint256 totalReports,
            uint256 accurateReports,
            uint256 totalVotes,
            uint256 positiveVotes,
            uint256 reputationScore,
            uint256 lastActivity,
            bool isActive,
            string memory nodeId,
            string memory registrationProof
        ) = coordination.getNodeReputation(node1);
        
        assertEq(reputationScore, 100);
        assertTrue(isActive);
        assertEq(totalReports, 0);
        assertEq(nodeId, "test-node-1");
        assertEq(registrationProof, "registration-proof-123");
    }

    function testUnauthorizedNodeRegistration() public {
        vm.expectRevert("Only governance can call this function");
        coordination.registerNode(node1, "node-1", "registration-proof-1");
    }

    function testAddGlobalThreat() public {
        // 首先注册节点
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "node-1", "registration-proof-1");
        
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,  // DDoS
            85, // 置信度
            "ipfs://evidence123",
            "Multiple DDoS attempts from this IP",
            true,  // 全球威胁
            "GLOBAL"
        );
        
        // 验证威胁是否被正确添加
        (
            string memory sourceIP,
            uint256 threatLevel,
            uint256 threatType,
            uint256 confidence,
            uint256 credibility,  // 需要验证这个值
            string memory evidenceHash,
            string memory context,
            uint256 lastUpdated,  // 需要验证这个值
            uint256 expirationTime,  // 需要验证这个值
            bool isGlobal,
            string memory region
        ) = coordination.getThreatIntelDetails("threat-001");
        
        assertEq(sourceIP, "192.168.1.100");
        assertEq(threatLevel, 80);
        assertEq(threatType, 0);
        assertEq(confidence, 85);
        assertEq(credibility, 50);  // 初始可信度
        assertEq(evidenceHash, "ipfs://evidence123");
        assertEq(context, "Multiple DDoS attempts from this IP");
        assertTrue(isGlobal);
        assertEq(region, "GLOBAL");
        assertTrue(lastUpdated > 0);  // 验证更新时间存在
        assertTrue(expirationTime > 0);  // 验证过期时间存在
        assertEq(evidenceHash, "ipfs://evidence123");
        assertEq(context, "Multiple DDoS attempts from this IP");
        assertTrue(isGlobal);
        assertEq(region, "GLOBAL");
        
        // 验证威胁计数
        assertEq(coordination.getThreatCount(), 1);
    }

    function testAddGlobalThreatWithInvalidData() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        // 测试无效的威胁级别
        vm.prank(node1);
        vm.expectRevert("Threat level too high");
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            150,  // 高于最大值
            0,
            85,
            "ipfs://evidence123",
            "Test",
            true,
            "GLOBAL"
        );
        
        // 测试无效的置信度
        vm.prank(node1);
        vm.expectRevert("Confidence must be <= 100");
        coordination.addGlobalThreat(
            "threat-002",
            "192.168.1.100",
            80,
            0,
            150,  // 高于100
            "ipfs://evidence123",
            "Test",
            true,
            "GLOBAL"
        );
        
        // 测试空的证据哈希
        vm.prank(node1);
        vm.expectRevert("Evidence hash is required");
        coordination.addGlobalThreat(
            "threat-003",
            "192.168.1.100",
            80,
            0,
            85,
            "",  // 空哈希
            "Test",
            true,
            "GLOBAL"
        );
    }

    function testUpdateGlobalThreat() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        // 添加威胁
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "Initial context",
            true,
            "GLOBAL"
        );
        
        // 更新威胁
        vm.prank(node1);
        coordination.updateGlobalThreat("threat-001", 90, 90, "Updated context");
        
        (
            string memory sourceIP,
            uint256 threatLevel,
            uint256 threatType,
            uint256 confidence,
            uint256 credibility,
            string memory evidenceHash,
            string memory context,
            uint256 lastUpdated,
            uint256 expirationTime,
            bool isGlobal,
            string memory region
        ) = coordination.getThreatIntelDetails("threat-001");
        
        assertEq(threatLevel, 90);
        assertEq(confidence, 90);
        assertEq(context, "Updated context");
        assertEq(sourceIP, "192.168.1.100");
        assertEq(threatType, 0);
        assertEq(credibility, 50);
        assertEq(evidenceHash, "ipfs://evidence123");
        assertTrue(lastUpdated > 0);
        assertTrue(expirationTime > 0);
        assertTrue(isGlobal);
        assertEq(region, "GLOBAL");
    }

    function testUnauthorizedThreatOperations() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "Test context",
            true,
            "GLOBAL"
        );
        
        // 未注册节点尝试更新威胁
        vm.expectRevert("Only authorized nodes can call this function");
        coordination.updateGlobalThreat("threat-001", 90, 90, "Unauthorized update");
        
        // 非治理地址尝试移除威胁
        vm.expectRevert("Only governance can call this function");
        coordination.removeGlobalThreat("threat-001", "Unauthorized removal");
    }

    function testThreatVoting() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        vm.prank(governanceAddr);
        coordination.registerNode(node2, "test-node-2");
        
        // 添加威胁
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "Test context",
            true,
            "GLOBAL"
        );
        
        // 节点1投票支持
        vm.prank(node1);
        coordination.voteOnThreat("threat-001", true);
        
        // 节点2投票反对
        vm.prank(node2);
        coordination.voteOnThreat("threat-001", false);
        
        // 验证威胁的投票统计
        (
            string memory sourceIP,
            uint256 threatLevel,
            uint256 threatType,
            uint256 confidence,
            uint256 credibility,
            string memory evidenceHash,
            string memory context,
            uint256 lastUpdated,
            uint256 expirationTime,
            bool isGlobal,
            string memory region
        ) = coordination.getThreatIntelDetails("threat-001");
        
        // 验证所有返回值
        assertEq(sourceIP, "192.168.1.100");
        assertEq(threatLevel, 80);
        assertEq(threatType, 0);
        assertEq(confidence, 85);
        assertEq(credibility, 50);
        assertEq(evidenceHash, "ipfs://evidence123");
        assertEq(context, "Test context");
        assertTrue(lastUpdated > 0);
        assertTrue(expirationTime > 0);
        assertTrue(isGlobal);
        assertEq(region, "GLOBAL");
    }

    function testRemoveGlobalThreat() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "Test context",
            true,
            "GLOBAL"
        );
        
        assertEq(coordination.getThreatCount(), 1);
        
        // 通过治理地址移除威胁
        vm.prank(governanceAddr);
        coordination.removeGlobalThreat("threat-001", "False positive");
        
        assertEq(coordination.getThreatCount(), 0);
    }

    function testNodeReputationUpdate() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        // 更新节点信誉
        vm.prank(governanceAddr);
        coordination.updateNodeReputation(node1, 850);
        
        // 验证节点信誉更新
        (, , , , uint256 reputationScore, , bool isActive, , ) = coordination.getNodeReputation(node1);
        
        assertEq(reputationScore, 850);
        assertTrue(isActive);
        
        assertEq(reputationScore, 850);
    }

    function testNodeActiveStatus() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        // 验证节点默认是活跃的
        assertTrue(coordination.hasSufficientReputation(node1));
        
        // 停用节点
        vm.prank(governanceAddr);
        coordination.setNodeActive(node1, false);
        
        assertFalse(coordination.hasSufficientReputation(node1));
        
        // 重新启用节点
        vm.prank(governanceAddr);
        coordination.setNodeActive(node1, true);
        
        assertTrue(coordination.hasSufficientReputation(node1));
    }

    function testGetGlobalThreatList() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        // 添加多个威胁
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "First threat",
            true,
            "GLOBAL"
        );
        
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-002",
            "10.0.0.50",
            60,
            1,
            75,
            "ipfs://evidence456",
            "Second threat",
            false,
            "REGION1"
        );
        
        // 获取威胁列表
        (
            string[] memory threatIds,
            string[] memory sourceIPs,
            uint256[] memory threatLevels,
            uint256[] memory threatTypes,
            uint256[] memory confidences,
            uint256[] memory credibilities
        ) = coordination.getGlobalThreatList(0, 10);
        
        assertEq(threatIds.length, 2);
        assertEq(threatIds[0], "threat-001");
        assertEq(threatIds[1], "threat-002");
        assertEq(sourceIPs[0], "192.168.1.100");
        assertEq(sourceIPs[1], "10.0.0.50");
        assertEq(threatLevels[0], 80);
        assertEq(threatLevels[1], 60);
        assertEq(threatTypes[0], 0);  // DDoS
        assertEq(threatTypes[1], 1);  // Malware
        assertEq(confidences[0], 85);
        assertEq(confidences[1], 75);
        assertEq(credibilities[0], 50);  // 初始可信度
        assertEq(credibilities[1], 50);
    }

    function testIsGlobalThreat() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "Global threat test",
            true,   // 全球威胁
            "GLOBAL"
        );
        
        vm.prank(node1);
        coordination.addGlobalThreat(
            "threat-002",
            "10.0.0.50",
            60,
            1,
            75,
            "ipfs://evidence456",
            "Regional threat test",
            false,  // 非全球威胁
            "REGION1"
        );
        
        assertTrue(coordination.isGlobalThreat("threat-001"));
        assertFalse(coordination.isGlobalThreat("threat-002"));
    }

    function testContractPause() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-1");
        
        // 暂停合约
        vm.prank(governanceAddr);
        coordination.pauseContract();
        
        assertEq(uint256(coordination.contractState()), uint256(ThreatIntelligenceCoordination.ContractState.Paused));
        
        // 尝试添加威胁应该失败
        vm.prank(node1);
        vm.expectRevert("Contract is not active");
        coordination.addGlobalThreat(
            "threat-001",
            "192.168.1.100",
            80,
            0,
            85,
            "ipfs://evidence123",
            "Test context",
            true,
            "GLOBAL"
        );
        
        // 恢复合约
        vm.prank(governanceAddr);
        coordination.resumeContract();
        
        assertEq(uint256(coordination.contractState()), uint256(ThreatIntelligenceCoordination.ContractState.Active));
    }

    function testEmergencyStop() public {
        vm.prank(governanceAddr);
        coordination.emergencyStop();
        
        assertEq(uint256(coordination.contractState()), uint256(ThreatIntelligenceCoordination.ContractState.EmergencyStopped));
    }

    function testAccessControl() public {
        // 测试非治理地址无法执行治理功能
        vm.expectRevert("Only governance can call this function");
        coordination.updateNodeReputation(node1, 500);
        
        vm.expectRevert("Only governance can call this function");
        coordination.removeGlobalThreat("threat-001", "reason");
        
        vm.expectRevert("Only governance can call this function");
        coordination.setNodeActive(node1, false);
    }
}