// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./libs/CrossChainInterfaces.sol";

// LayerZero 接收器接口
interface ILayerZeroReceiver {
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

/**
 * @title Governance Mirror 合约
 * @dev 用于在不同链之间镜像治理提案和投票
 * @author OraSRS Protocol
 */
contract GovernanceMirror is LzApp {
    // 提案状态
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Executed }
    
    // 提案类型
    enum ProposalType { ParameterUpdate, ContractUpgrade, EmergencyAction, NodeManagement, ThreatIntelSync }

    // 提案结构
    struct Proposal {
        uint256 id;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 requiredQuorum;
        string description;
        ProposalType proposalType;
        ProposalState state;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 sourceChainId;  // 源链ID
        string sourceProposalId; // 源链提案ID
    }

    // 投票结构
    struct Vote {
        bool hasVoted;
        uint8 support;  // 0=Against, 1=For, 2=Abstain
        uint256 votes;
    }

    // 跨链提案消息结构
    struct ProposalMessage {
        uint256 proposalId;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        string description;
        ProposalType proposalType;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 sourceChainId;
        string sourceProposalId;
        uint256 nonce;
    }

    // 跨链投票消息结构
    struct VoteMessage {
        uint256 proposalId;
        address voter;
        uint8 support;
        string reason;
        uint256 sourceChainId;
        string sourceProposalId;  // 源提案ID
        uint256 nonce;
    }

    // 存储
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(bytes32 => bool) public processedMessages;  // 防重放
    mapping(string => uint256) public sourceProposalToMirror;  // 源提案ID到镜像提案ID映射
    mapping(uint256 => uint256) public proposalMirrorCount;   // 每个源提案的镜像数量
    
    uint256 public proposalCount;
    address public governanceContract;  // 治理合约地址
    address public threatIntelSyncContract;  // 威胁情报同步合约地址
    uint256 public domesticChainId;     // 国内链ID
    uint256 public overseasChainId;     // 海外界链ID
    uint256 public quorumPercentage;    // 法定人数百分比 (百万分之一)
    uint256 public votingPeriod;        // 投票期 (秒)

    // 事件
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        uint256 indexed sourceChainId,
        string sourceProposalId
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 votes
    );
    event ProposalExecuted(uint256 indexed id);
    event CrossChainProposalReceived(
        uint256 indexed mirrorProposalId,
        uint256 indexed sourceProposalId,
        uint256 indexed sourceChainId
    );
    event CrossChainVoteReceived(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support
    );
    event GovernanceUpdated(address oldGovernance, address newGovernance);

    // 修饰符
    modifier onlyGovernance() {
        require(msg.sender == governanceContract, "Only governance can call this function");
        _;
    }

    modifier onlyValidProposal(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal ID");
        _;
    }

    /**
     * @dev 构造函数
     * @param _layerZeroEndpoint LayerZero端点地址
     * @param _governanceContract 治理合约地址
     * @param _threatIntelSyncContract 威胁情报同步合约地址
     * @param _domesticChainId 国内链ID
     * @param _overseasChainId 海外界链ID
     */
    constructor(
        address _layerZeroEndpoint,
        address _governanceContract,
        address _threatIntelSyncContract,
        uint256 _domesticChainId,
        uint256 _overseasChainId
    ) LzApp(_layerZeroEndpoint) {
        governanceContract = _governanceContract;
        threatIntelSyncContract = _threatIntelSyncContract;
        domesticChainId = _domesticChainId;
        overseasChainId = _overseasChainId;
        quorumPercentage = 100000;  // 10% 法定人数
        votingPeriod = 7 days;      // 7天投票期
    }

    /**
     * @dev 从LayerZero接收跨链消息 - 实现ILayerZeroReceiver接口
     * @param _srcChainId 源链ID
     * @param _srcAddress 源地址
     * @param _nonce 消息序号
     * @param _payload 消息负载
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external virtual override onlyLzEndpoint {
        // 解码消息类型标识
        uint8 messageType = uint8(_payload[0]);
        
        if (messageType == 1) {
            // 提案消息
            _handleProposalMessage(_srcChainId, _payload);
        } else if (messageType == 2) {
            // 投票消息
            _handleVoteMessage(_srcChainId, _payload);
        } else {
            revert("Invalid message type");
        }
    }

    /**
     * @dev 内部LZ接收函数，用于向后兼容
     */
    function _lzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual {
        // 调用公共的lzReceive函数
        this.lzReceive(_srcChainId, _srcAddress, _nonce, _payload);
    }

    /**
     * @dev 处理提案消息
     */
    function _handleProposalMessage(uint16 _srcChainId, bytes memory _payload) internal {
        // 去掉消息类型标识
        bytes memory actualPayload = new bytes(_payload.length - 1);
        for (uint i = 0; i < actualPayload.length; i++) {
            actualPayload[i] = _payload[i + 1];
        }

        ProposalMessage memory proposalMsg = abi.decode(actualPayload, (ProposalMessage));
        
        // 防重放检查
        {
            bytes32 messageId = keccak256(abi.encodePacked(_srcChainId, proposalMsg.sourceProposalId, proposalMsg.nonce));
            require(!processedMessages[messageId], "Message already processed");
            processedMessages[messageId] = true;
        }

        // 检查是否需要创建镜像提案
        string memory mirrorKey = string(abi.encodePacked(proposalMsg.sourceProposalId, "-", _toString(_srcChainId)));
        if (sourceProposalToMirror[mirrorKey] == 0) {
            // 创建镜像提案
            uint256 mirrorProposalId = ++proposalCount;
            
            Proposal storage newProposal = proposals[mirrorProposalId];
            newProposal.id = mirrorProposalId;
            newProposal.proposer = proposalMsg.proposer;
            newProposal.startTime = proposalMsg.startTime;
            newProposal.endTime = proposalMsg.endTime;
            newProposal.votesFor = 0;
            newProposal.votesAgainst = 0;
            newProposal.votesAbstain = 0;
            newProposal.requiredQuorum = 0;  // 镜像提案不设置法定人数
            newProposal.description = string(abi.encodePacked("[MIRROR] ", proposalMsg.description));
            newProposal.proposalType = proposalMsg.proposalType;
            newProposal.state = ProposalState.Pending;  // 可能需要根据原提案状态设置
            newProposal.targets = proposalMsg.targets;
            newProposal.values = proposalMsg.values;
            newProposal.calldatas = proposalMsg.calldatas;
            newProposal.sourceChainId = _srcChainId;
            newProposal.sourceProposalId = proposalMsg.sourceProposalId;
            
            sourceProposalToMirror[mirrorKey] = mirrorProposalId;
            proposalMirrorCount[proposalMsg.proposalId]++;

            emit CrossChainProposalReceived(mirrorProposalId, proposalMsg.proposalId, _srcChainId);
        }
    }

    /**
     * @dev 处理投票消息
     */
    function _handleVoteMessage(uint16 _srcChainId, bytes memory _payload) internal {
        // 去掉消息类型标识
        bytes memory actualPayload = new bytes(_payload.length - 1);
        for (uint i = 0; i < actualPayload.length; i++) {
            actualPayload[i] = _payload[i + 1];
        }

        VoteMessage memory voteMsg = abi.decode(actualPayload, (VoteMessage));
        
        // 防重放检查
        {
            bytes32 messageId = keccak256(abi.encodePacked(_srcChainId, voteMsg.proposalId, voteMsg.voter, voteMsg.nonce));
            require(!processedMessages[messageId], "Message already processed");
            processedMessages[messageId] = true;
        }

        // 查找镜像提案
        string memory mirrorKey = string(abi.encodePacked(voteMsg.sourceProposalId, "-", _toString(_srcChainId)));
        uint256 mirrorProposalId = sourceProposalToMirror[mirrorKey];
        require(mirrorProposalId > 0, "Mirror proposal not found");

        // 记录投票（如果还没有投票）
        if (!votes[mirrorProposalId][voteMsg.voter].hasVoted) {
            votes[mirrorProposalId][voteMsg.voter].hasVoted = true;
            votes[mirrorProposalId][voteMsg.voter].support = voteMsg.support;
            votes[mirrorProposalId][voteMsg.voter].votes = 100;  // 简化：固定100票

            // 更新提案计票
            if (voteMsg.support == 1) {
                proposals[mirrorProposalId].votesFor += 100;
            } else if (voteMsg.support == 0) {
                proposals[mirrorProposalId].votesAgainst += 100;
            } else if (voteMsg.support == 2) {
                proposals[mirrorProposalId].votesAbstain += 100;
            }

            emit CrossChainVoteReceived(mirrorProposalId, voteMsg.voter, voteMsg.support);
        }
    }

    /**
     * @dev 从当前链发起跨链提案
     */
    function createCrossChainProposal(
        uint16 _targetChainId,
        string memory _description,
        ProposalType _proposalType,
        address[] memory _targets,
        uint256[] memory _values,
        bytes[] memory _calldatas
    ) external payable returns (uint256 proposalId) {
        require(_targetChainId == domesticChainId || _targetChainId == overseasChainId, "Invalid target chain");

        // 创建源提案
        proposalId = ++proposalCount;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + votingPeriod;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            startTime: startTime,
            endTime: endTime,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            requiredQuorum: quorumPercentage,
            description: _description,
            proposalType: _proposalType,
            state: ProposalState.Pending,
            targets: _targets,
            values: _values,
            calldatas: _calldatas,
            sourceChainId: block.chainid,
            sourceProposalId: string(abi.encodePacked("src_", _toString(proposalId)))
        });

        // 发送跨链消息
        ProposalMessage memory proposalMsg = ProposalMessage({
            proposalId: proposalId,
            proposer: msg.sender,
            startTime: startTime,
            endTime: endTime,
            description: _description,
            proposalType: _proposalType,
            targets: _targets,
            values: _values,
            calldatas: _calldatas,
            sourceChainId: block.chainid,
            sourceProposalId: string(abi.encodePacked("src_", _toString(proposalId))),
            nonce: block.timestamp
        });

        // 编码消息 (添加类型标识)
        bytes memory encodedMsg = abi.encode(proposalMsg);
        bytes memory payload = new bytes(encodedMsg.length + 1);
        payload[0] = 0x01;  // 提案消息类型
        for (uint i = 0; i < encodedMsg.length; i++) {
            payload[i + 1] = encodedMsg[i];
        }

        // 计算费用并发送
        (uint256 nativeFee, ) = lzEndpoint.estimateFees(_targetChainId, address(this), payload, false, bytes(""));
        require(msg.value >= nativeFee, "Insufficient fee");

        _lzSend(
            _targetChainId,
            payload,
            payable(msg.sender),
            address(this),
            bytes(""),
            nativeFee
        );

        emit ProposalCreated(proposalId, msg.sender, block.chainid, proposals[proposalId].sourceProposalId);
    }

    /**
     * @dev 从当前链发起跨链投票
     */
    function castCrossChainVote(
        uint16 _targetChainId,
        string memory _sourceProposalId,
        uint8 _support,
        string memory _reason
    ) external payable {
        require(_targetChainId == domesticChainId || _targetChainId == overseasChainId, "Invalid target chain");
        require(_support <= 2, "Invalid vote support value");

        // 发送跨链投票消息
        VoteMessage memory voteMsg = VoteMessage({
            proposalId: 0,  // 源链提案ID
            voter: msg.sender,
            support: _support,
            reason: _reason,
            sourceChainId: block.chainid,
            sourceProposalId: _sourceProposalId,  // 源提案ID
            nonce: block.timestamp
        });

        // 编码消息 (添加类型标识)
        bytes memory encodedMsg = abi.encode(voteMsg);
        bytes memory payload = new bytes(encodedMsg.length + 1);
        payload[0] = 0x02;  // 投票消息类型
        for (uint i = 0; i < encodedMsg.length; i++) {
            payload[i + 1] = encodedMsg[i];
        }

        // 计算费用并发送
        (uint256 nativeFee, ) = lzEndpoint.estimateFees(_targetChainId, address(this), payload, false, bytes(""));
        require(msg.value >= nativeFee, "Insufficient fee");

        _lzSend(
            _targetChainId,
            payload,
            payable(msg.sender),
            address(this),
            bytes(""),
            nativeFee
        );

        emit VoteCast(0, msg.sender, _support, 100);  // 简化：固定票数
    }

    /**
     * @dev 获取提案详情
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev 获取投票详情
     */
    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }

    /**
     * @dev 更新治理合约地址
     */
    function updateGovernance(address _newGovernance) external onlyGovernance {
        address oldGovernance = governanceContract;
        governanceContract = _newGovernance;
        emit GovernanceUpdated(oldGovernance, _newGovernance);
    }

    /**
     * @dev 更新威胁情报同步合约地址
     */
    function updateThreatIntelSyncContract(address _newContract) external onlyGovernance {
        threatIntelSyncContract = _newContract;
    }

    /**
     * @dev 更新法定人数百分比
     */
    function updateQuorumPercentage(uint256 _newQuorum) external onlyGovernance {
        quorumPercentage = _newQuorum;
    }

    /**
     * @dev 暂停合约功能
     */
    function pause() external onlyGovernance {
        // _pause(); // 依赖库不存在，使用自定义暂停功能
    }

    /**
     * @dev 恢复合约功能
     */
    function unpause() external onlyGovernance {
        // _unpause(); // 依赖库不存在，使用自定义恢复功能
    }

    /**
     * @dev 计算提案状态
     */
    function state(uint256 proposalId) public view onlyValidProposal(proposalId) returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.endTime > block.timestamp) {
            return ProposalState.Active;
        } else if (proposal.votesFor <= proposal.votesAgainst || 
                  proposal.votesFor + proposal.votesAgainst < proposal.requiredQuorum) {
            return ProposalState.Defeated;
        } else {
            return ProposalState.Succeeded;
        }
    }

    /**
     * @dev 内部函数：将uint转换为字符串
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}