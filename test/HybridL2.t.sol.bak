// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/ThreatIntelSync.sol";
import "../contracts/GovernanceMirror.sol";

// 模拟LayerZeroEndpoint的测试合约
contract MockLayerZeroEndpoint {
    address lzApp;

    function setLzApp(address _lzApp) external {
        lzApp = _lzApp;
    }

    function lzReceive(
        address _from,
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external {
        require(msg.sender == lzApp, "Only lzApp can call lzReceive");
        (bool success,) = lzApp.call(
            abi.encodeWithSignature(
                "_lzReceive(uint16,bytes,uint64,bytes)",
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            )
        );
        require(success, "LzApp failed to process message");
    }
    
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes memory _adapterParams
    ) external pure returns (uint256 nativeFee, uint256 zroFee) {
        return (1e17, 0); // 0.1 ETH fee
    }
}

contract HybridL2Test is Test {
    ThreatIntelSync public threatIntelSync;
    GovernanceMirror public governanceMirror;
    MockLayerZeroEndpoint public mockLzEndpoint;
    
    address public governanceAddr = address(0x1234567890123456789012345678901234567890);
    address public user = address(0x100);

    function setUp() public {
        mockLzEndpoint = new MockLayerZeroEndpoint();
        
        threatIntelSync = new ThreatIntelSync(
            address(mockLzEndpoint),
            governanceAddr,
            31337,  // Domestic chain ID
            11155420 // Overseas chain ID
        );
        
        governanceMirror = new GovernanceMirror(
            address(mockLzEndpoint),
            governanceAddr,
            address(threatIntelSync),
            31337,  // Domestic chain ID
            11155420 // Overseas chain ID
        );
        
        // 设置Mock LayerZero
        mockLzEndpoint.setLzApp(address(threatIntelSync));
    }

    function testDeployAndConfigure() public {
        assertEq(threatIntelSync.governanceContract(), governanceAddr);
        assertEq(governanceMirror.governanceContract(), governanceAddr);
        assertEq(threatIntelSync.domesticChainId(), 31337);
        assertEq(threatIntelSync.overseasChainId(), 11155420);
    }

    function testSendThreatIntel() public {
        vm.prank(user);
        vm.deal(user, 1 ether);
        
        vm.expectEmit(true, true, true, true);
        emit ThreatIntelSync.ThreatIntelSent("test-threat-001", block.chainid, 11155420);
        
        // 发送威胁情报
        uint256 fee = threatIntelSync.quoteSendThreatIntel(
            11155420,  // OP Sepolia
            "test-threat-001",
            "192.168.1.1",
            85,
            1,
            "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "Beijing, China"
        );
        
        vm.prank(user);
        threatIntelSync.sendThreatIntel{value: fee}(
            11155420,  // OP Sepolia
            "test-threat-001",
            "192.168.1.1",
            85,
            1,
            "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            "Beijing, China"
        );
        
        // 验证威胁情报已存储
        (,string memory sourceIP,,uint256 threatType,,,) = threatIntelSync.getThreatIntel("test-threat-001", block.chainid);
        assertEq(sourceIP, "192.168.1.1");
        assertEq(threatType, 1);
    }

    function testReceiveThreatIntel() public {
        // 构造威胁情报消息
        ThreatIntelSync.ThreatMessage memory threatMessage = ThreatIntelSync.ThreatMessage({
            threat: ThreatIntelSync.ThreatIntel({
                threatId: "test-threat-002",
                sourceIP: "203.0.113.1",
                threatLevel: 90,
                threatType: 2,
                timestamp: block.timestamp,
                evidenceHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                geolocation: "Shanghai, China",
                sourceChainId: 11155420,
                reporter: user,
                isProcessed: false
            }),
            nonce: 1
        });

        bytes memory payload = abi.encode(threatMessage);
        // 添加消息类型标识
        bytes memory fullPayload = new bytes(payload.length + 1);
        fullPayload[0] = 0x01;  // Threat message type
        for (uint i = 0; i < payload.length; i++) {
            fullPayload[i + 1] = payload[i];
        }

        // 模拟从其他链接收消息
        vm.prank(address(mockLzEndpoint));
        mockLzEndpoint.lzReceive(
            address(threatIntelSync),
            11155420,  // Source chain ID (OP Sepolia)
            bytes("0x000000000000000000000000"),  // Source address
            1,  // Nonce
            fullPayload
        );

        // 验证威胁情报已接收
        (,string memory sourceIP,,uint256 threatType,,,) = threatIntelSync.getThreatIntel("test-threat-002", 11155420);
        assertEq(sourceIP, "203.0.113.1");
        assertEq(threatType, 2);
    }

    function testGovernanceMirror() public {
        vm.prank(governanceAddr);
        uint256 proposalId = governanceMirror.createCrossChainProposal{value: 1e17}(
            11155420,  // Target chain
            "Test governance proposal",
            GovernanceMirror.ProposalType.ParameterUpdate,
            new address[](0),
            new uint256[](0),
            new bytes[](0)
        );
        
        // 验证提案已创建
        GovernanceMirror.Proposal memory proposal = governanceMirror.getProposal(proposalId);
        assertEq(proposal.proposer, governanceAddr);
        assertEq(proposal.description, "Test governance proposal");
    }

    function testCrossChainVote() public {
        vm.prank(user);
        vm.deal(user, 1 ether);
        
        // 发送跨链投票
        vm.prank(user);
        governanceMirror.castCrossChainVote{value: 1e17}(
            11155420,  // Target chain
            "test-proposal-001",
            1,  // Support
            "Test vote reason"
        );
    }
}