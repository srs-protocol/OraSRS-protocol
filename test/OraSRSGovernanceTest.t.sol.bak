// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/OraSRSGovernance.sol";

contract OraSRSGovernanceTest is Test {
    OraSRSGovernance public governance;
    address public governanceAddr;
    address public timelock;
    address public threatIntelligenceCoordination;
    address public voter1;
    address public voter2;
    address public proposer;

    function setUp() public {
        governanceAddr = address(1);
        timelock = address(2);
        threatIntelligenceCoordination = address(3);
        voter1 = address(4);
        voter2 = address(5);
        proposer = address(6);
        
        governance = new OraSRSGovernance(timelock, threatIntelligenceCoordination);
    }

    function testContractInitialization() public {
        assertEq(governance.owner(), governanceAddr);
        assertEq(governance.timelock(), timelock);
        assertEq(governance.threatIntelligenceCoordination(), threatIntelligenceCoordination);
        
        // 验证默认参数
        assertEq(governance.proposalThreshold(), 100000);
        assertEq(governance.votingDelay(), 1);
        assertEq(governance.votingPeriod(), 40320);
        assertEq(governance.proposalQuorum(), 100000);
    }

    function testProposalCreation() public {
        address[] memory targets = new address[](1);
        targets[0] = address(100);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("pauseContract()");
        
        vm.prank(proposer);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, voter1),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(800), uint256(0), true, "", "")
        );
        
        uint256 proposalId = governance.propose(
            targets,
            values,
            calldatas,
            "Test proposal for pausing contract",
            OraSRSGovernance.ProposalType.EmergencyAction
        );
        
        assertEq(proposalId, 1);
        
        // 验证提案信息
        (address proposerAddr, , , , , , uint256 requiredQuorum, string memory description, OraSRSGovernance.ProposalType proposalType, OraSRSGovernance.ProposalState state) = governance.getProposalDetails(proposalId);
        
        assertEq(proposerAddr, proposer);
        assertEq(description, "Test proposal for pausing contract");
        assertEq(uint256(proposalType), uint256(OraSRSGovernance.ProposalType.EmergencyAction));
        assertEq(uint256(state), uint256(OraSRSGovernance.ProposalState.Pending));
        assertEq(requiredQuorum, 100000);
    }

    function testProposalWithInsufficientVotingPower() public {
        address[] memory targets = new address[](1);
        targets[0] = address(100);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("pauseContract()");
        
        vm.prank(proposer);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(50), uint256(0), true, "", "")
        );
        
        vm.expectRevert("Proposer below proposal threshold");
        governance.propose(
            targets,
            values,
            calldatas,
            "Test proposal",
            OraSRSGovernance.ProposalType.ParameterUpdate
        );
    }

    function testProposalVoting() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(100);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("pauseContract()");
        
        vm.prank(proposer);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(1200), uint256(0), true, "", "")
        );
        
        uint256 proposalId = governance.propose(
            targets,
            values,
            calldatas,
            "Test proposal for voting",
            OraSRSGovernance.ProposalType.EmergencyAction
        );
        
        // 模拟提案变为活跃状态
        vm.warp(block.timestamp + 2); // 超过votingDelay
        
        // 进行投票
        vm.prank(voter1);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, voter1),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(800), uint256(0), true, "", "")
        );
        
        vm.expectEmit(true, true, false, true);
        governance.castVote(proposalId, 1, "Support this proposal"); // 1 = For
        
        // 再次投票应该失败
        vm.expectRevert("Already voted");
        governance.castVote(proposalId, 1, "Vote again");
    }

    function testProposalVotingWithoutReason() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(100);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("pauseContract()");
        
        vm.prank(proposer);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(1200), uint256(0), true, "", "")
        );
        
        uint256 proposalId = governance.propose(
            targets,
            values,
            calldatas,
            "Test proposal for voting",
            OraSRSGovernance.ProposalType.EmergencyAction
        );
        
        // 模拟提案变为活跃状态
        vm.warp(block.timestamp + 2);
        
        // 进行投票（不带理由）
        vm.prank(voter1);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, voter1),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(800), uint256(0), true, "", "")
        );
        
        governance.castVote(proposalId, 1); // 1 = For
    }

    function testInvalidVoteSupport() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(100);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("pauseContract()");
        
        vm.prank(proposer);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(1200), uint256(0), true, "", "")
        );
        
        uint256 proposalId = governance.propose(
            targets,
            values,
            calldatas,
            "Test proposal for invalid vote",
            OraSRSGovernance.ProposalType.EmergencyAction
        );
        
        vm.warp(block.timestamp + 2);
        
        // 尝试无效的投票支持值
        vm.prank(voter1);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, voter1),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(800), uint256(0), true, "", "")
        );
        
        vm.expectRevert("Invalid vote support value");
        governance.castVote(proposalId, 3); // 3是无效值
    }

    function testGovernanceParameterUpdate() public {
        // 更新治理参数
        vm.prank(governanceAddr);
        governance.updateGovernanceParameters(1500000, 50000, 150000);
        
        assertEq(governance.proposalThreshold(), 1500000);
        assertEq(governance.votingPeriod(), 50000);
        assertEq(governance.proposalQuorum(), 150000);
    }

    function testUnauthorizedParameterUpdate() public {
        vm.expectRevert("Only owner can call this function");
        governance.updateGovernanceParameters(1500000, 50000, 150000);
    }

    function testProposalStateTransitions() public {
        // 创建提案
        address[] memory targets = new address[](1);
        targets[0] = address(100);
        
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("pauseContract()");
        
        vm.prank(proposer);
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(1200), uint256(0), true, "", "")
        );
        
        uint256 proposalId = governance.propose(
            targets,
            values,
            calldatas,
            "Test proposal state transitions",
            OraSRSGovernance.ProposalType.EmergencyAction
        );
        
        // 初始状态应该是Pending
        assert(uint256(governance.state(proposalId)) == uint256(OraSRSGovernance.ProposalState.Pending));
        
        // 时间前进到投票期
        vm.warp(block.timestamp + 2);
        assert(uint256(governance.state(proposalId)) == uint256(OraSRSGovernance.ProposalState.Active));
        
        // 时间前进到期末
        vm.warp(block.timestamp + 50000); // 超过投票期
        
        // 由于没有足够的票数，提案应该失败
        // 但我们需要模拟投票来达到足够的票数和法定人数
    }

    function testAccessControl() public {
        // 测试非所有者无法更新参数
        vm.expectRevert("Only owner can call this function");
        governance.updateGovernanceParameters(1500000, 50000, 150000);
        
        // 测试非所有者无法进行紧急暂停
        vm.expectRevert("Only owner can call this function");
        governance.emergencyPause();
    }

    function testGetVotingPower() public {
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, voter1),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(1200), uint256(0), true, "", "")
        );
        
        uint256 votingPower = governance.getVotingPower(voter1, block.timestamp);
        assertEq(votingPower, 1000); // 治理合约会将信誉分数限制在1000
    }

    function testProposalThresholdCheck() public {
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(1200), uint256(0), true, "", "")
        );
        
        bool valid = governance.isValidProposalThreshold(proposer);
        assertTrue(valid);
        
        vm.mockCall(
            threatIntelligenceCoordination,
            abi.encodeWithSelector(ThreatIntelligenceCoordination.getNodeReputation.selector, proposer),
            abi.encode(uint256(0), uint256(0), uint256(0), uint256(0), uint256(50), uint256(0), true, "", "") // 低于阈值
        );
        
        valid = governance.isValidProposalThreshold(proposer);
        assertFalse(valid);
    }
}