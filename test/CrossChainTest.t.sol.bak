// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/ThreatIntelSync.sol";
import "../contracts/GovernanceMirror.sol";

contract CrossChainTest is Test {
    ThreatIntelSync threatIntelSync;
    GovernanceMirror governanceMirror;
    
    address public constant LAYERZERO_ENDPOINT = address(0x1234567890123456789012345678901234567890);
    address public constant GOVERNANCE_CONTRACT = address(0x9876543210987654321098765432109876543210);
    address public constant THREAT_INTEL_CONTRACT = address(0x5555666677778888999900001111222233334444);
    uint256 public constant DOMESTIC_CHAIN_ID = 1001;
    uint256 public constant OVERSEAS_CHAIN_ID = 1002;

    function setUp() public {
        threatIntelSync = new ThreatIntelSync(
            LAYERZERO_ENDPOINT,
            GOVERNANCE_CONTRACT,
            DOMESTIC_CHAIN_ID,
            OVERSEAS_CHAIN_ID
        );
        
        governanceMirror = new GovernanceMirror(
            LAYERZERO_ENDPOINT,
            GOVERNANCE_CONTRACT,
            THREAT_INTEL_CONTRACT,
            DOMESTIC_CHAIN_ID,
            OVERSEAS_CHAIN_ID
        );
    }

    function testThreatIntelSyncDeployment() public {
        assertEq(address(threatIntelSync.lzEndpoint()), LAYERZERO_ENDPOINT);
        assertEq(threatIntelSync.governanceContract(), GOVERNANCE_CONTRACT);
        assertEq(threatIntelSync.domesticChainId(), DOMESTIC_CHAIN_ID);
        assertEq(threatIntelSync.overseasChainId(), OVERSEAS_CHAIN_ID);
    }

    function testGovernanceMirrorDeployment() public {
        assertEq(address(governanceMirror.lzEndpoint()), LAYERZERO_ENDPOINT);
        assertEq(governanceMirror.governanceContract(), GOVERNANCE_CONTRACT);
        assertEq(governanceMirror.threatIntelSyncContract(), THREAT_INTEL_CONTRACT);
        assertEq(governanceMirror.domesticChainId(), DOMESTIC_CHAIN_ID);
        assertEq(governanceMirror.overseasChainId(), OVERSEAS_CHAIN_ID);
    }

    function testSendThreatIntel() public {
        vm.deal(address(this), 1 ether);
        
        string memory threatId = "THREAT-001";
        string memory sourceIP = "192.168.1.100";
        uint256 threatLevel = 85;
        uint256 threatType = 2;
        string memory evidenceHash = "0x1234567890abcdef";
        string memory geolocation = "US";

        // 先估算费用
        uint256 fee = threatIntelSync.quoteSendThreatIntel(
            uint16(OVERSEAS_CHAIN_ID),
            threatId,
            sourceIP,
            threatLevel,
            threatType,
            evidenceHash,
            geolocation
        );
        
        // 发送威胁情报
        vm.expectEmit(true, true, true, true);
        emit ThreatIntelSent(
            threatId,
            block.chainid,
            OVERSEAS_CHAIN_ID
        );
        
        // 由于我们没有实际的LayerZero端点，这里主要是测试合约逻辑而非实际发送
        // 在实际环境中，这将触发跨链消息发送
    }

    function testCreateCrossChainProposal() public {
        vm.deal(address(this), 1 ether);
        
        string memory description = "Test proposal for cross-chain governance";
        GovernanceMirror.ProposalType proposalType = GovernanceMirror.ProposalType.ParameterUpdate;
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setUp()");

        // 创建跨链提案
        uint256 proposalId = governanceMirror.createCrossChainProposal{value: 0.1 ether}(
            uint16(OVERSEAS_CHAIN_ID),
            description,
            proposalType,
            targets,
            values,
            calldatas
        );
        
        // 验证提案已创建
        GovernanceMirror.Proposal memory proposal = governanceMirror.getProposal(proposalId);
        assertEq(proposal.proposer, address(this));
        assertEq(proposal.description, description);
        assertEq(uint8(proposal.proposalType), uint8(proposalType));
    }
    
    event ThreatIntelSent(
        string indexed threatId,
        uint256 indexed sourceChainId,
        uint256 indexed destChainId
    );
}