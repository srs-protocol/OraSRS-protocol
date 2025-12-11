// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/ThreatEvidence.sol";
import "../contracts/ThreatIntelligenceCoordination.sol";
import "../contracts/OraSRSGovernance.sol";

contract OraSRSSecurityTest is Test {
    ThreatEvidence public threatEvidence;
    ThreatIntelligenceCoordination public coordination;
    OraSRSGovernance public governance;
    address public governanceAddr;
    address public node1;
    address public attacker;
    address public validator;

    function setUp() public {
        governanceAddr = address(1);
        node1 = address(2);
        attacker = address(4);
        validator = address(5);
        
        // 部署合约进行安全测试
        threatEvidence = new ThreatEvidence(governanceAddr);
        coordination = new ThreatIntelligenceCoordination(governanceAddr, address(threatEvidence));
        governance = new OraSRSGovernance(governanceAddr, address(coordination));
        
        // 授权验证器
        vm.prank(governanceAddr);
        threatEvidence.addAuthorizedValidator(validator);
    }

    // 测试：合约初始化
    function testContractInitialization() public {
        assertEq(threatEvidence.owner(), governanceAddr);
        assertEq(coordination.owner(), address(this)); // 部署者为owner
        assertEq(governance.owner(), address(this));
    }

    // 测试：权限控制
    function testAccessControl() public {
        // 非治理地址尝试添加验证器 - 应该失败或被限制
        vm.prank(attacker);
        vm.expectRevert();
        threatEvidence.addAuthorizedValidator(attacker);
    }

    // 测试：节点注册宽松性
    function testOpenNodeRegistration() public {
        vm.prank(governanceAddr);
        coordination.registerNode(node1, "test-node-open");
        
        // 验证节点已注册
        (, address nodeOwner, , , , , bool isActive, string memory nodeId, ) = coordination.getNodeReputation(node1);
        assertTrue(isActive);
        assertEq(nodeId, "test-node-open");
        assertEq(nodeOwner, node1);
    }
    
    // 测试：治理参数宽松性
    function testGovernanceParameters() public {
        // 验证治理参数已设置为更宽松的值
        assertEq(governance.proposalThreshold(), 1000); // 更低的提案门槛
        assertEq(governance.proposalQuorum(), 1000);    // 更低的法定人数
    }
    
    // 测试：威胁报告提交（无质押要求）
    function testThreatReportSubmission() public {
        vm.prank(node1);
        coordination.registerNode(node1, "reporter-node");
        
        // 提交威胁报告
        vm.warp(1234567890);
        vm.prank(node1);
        
        ThreatEvidence.ThreatReportData memory reportData = ThreatEvidence.ThreatReportData({
            threatType: 0,
            sourceIP: "192.168.1.100",
            targetIP: "192.168.1.1",
            threatLevel: 2,
            context: "Multiple connection attempts detected",
            evidenceHash: "ipfs://evidence123",
            geolocation: "US-CA"
        });
        
        // 应该能够成功提交威胁报告，无需质押
        vm.prank(node1);
        threatEvidence.submitThreatReport(reportData, 1);
        
        // 验证威胁报告已提交
        assertTrue(threatEvidence.threatReportExists("threat_192.168.1.100_1234567890"));
    }
}

// 简化的攻击合约
contract ReentrancyAttacker {
    OraSRSGovernance public target;
    
    constructor(address payable _target) {
        target = OraSRSGovernance(_target);
    }
    
    function attack() public payable {
        // 尝试进行重入攻击
    }
    
    receive() external payable {
        // 重入点
    }
}