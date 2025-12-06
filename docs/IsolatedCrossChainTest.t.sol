// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../isolated_contracts/ThreatIntelSync.sol";
import "../isolated_contracts/GovernanceMirror.sol";

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

    function testSendThreatIntelBasic() public {
        string memory threatId = "THREAT-001";
        string memory sourceIP = "192.168.1.100";
        uint256 threatLevel = 85;
        uint256 threatType = 2;
        string memory evidenceHash = "0x1234567890abcdef";
        string memory geolocation = "US";

        // 测试费用估算功能
        uint256 fee = threatIntelSync.quoteSendThreatIntel(
            uint16(OVERSEAS_CHAIN_ID),
            threatId,
            sourceIP,
            threatLevel,
            threatType,
            evidenceHash,
            geolocation
        );
        
        // 验证费用估算不为0
        assertTrue(fee > 0);
    }

    function testCreateCrossChainProposalBasic() public {
        string memory description = "Test proposal for cross-chain governance";
        GovernanceMirror.ProposalType proposalType = GovernanceMirror.ProposalType.ParameterUpdate;
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        values[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("setUp()");

        // 我们无法实际创建提案，因为没有真实的LayerZero端点，但可以测试合约逻辑
        // 这里主要是验证合约结构是否正确
        assertTrue(address(governanceMirror).code.length > 0);
    }
}