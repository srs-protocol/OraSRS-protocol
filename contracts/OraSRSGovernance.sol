// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./ThreatIntelligenceCoordination.sol";

/**
 * @title OraSRS 治理合约
 * @dev 用于OraSRS协议的去中心化治理
 * @author OraSRS Protocol
 * @notice 该合约实现了协议的治理功能，包括提案、投票和执行
 */
contract OraSRSGovernance {
    // 提案状态
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Queued, Executed }
    
    // 提案类型
    enum ProposalType { ParameterUpdate, ContractUpgrade, EmergencyAction, NodeManagement }
    
    // 提案结构
    struct Proposal {
        uint256 id;
        address proposer;
        uint256 startTime;
        uint256 endTime;
        uint256 executionTime;
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
        mapping(address => Vote) votes;
    }
    
    // 投票结构
    struct Vote {
        bool hasVoted;
        uint8 support;  // 0=Against, 1=For, 2=Abstain
        uint256 votes;
    }
    
    // 重要参数
    uint256 public proposalThreshold;      // 提案所需最低票数
    uint256 public votingDelay;            // 投票延迟（区块数）
    uint256 public votingPeriod;           // 投票期（区块数）
    uint256 public proposalQuorum;         // 提案所需法定人数比例（百万分之一）
    uint256 public executionDelay;         // 执行延迟（秒）
    
    // 治理状态
    address public owner;
    address public timelock;               // 时间锁合约地址
    address public threatIntelligenceCoordination; // 威胁情报协调合约地址
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    // 兼容性别名 - 以前的 consensusContract 现在是 threatIntelligenceCoordination
    function consensusContract() external view returns (address) {
        return threatIntelligenceCoordination;
    }
    
    // 事件
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas,
        uint256 startTime,
        uint256 endTime,
        string description
    );
    
    event VoteCast(
        address indexed voter,
        uint256 proposalId,
        uint8 support,
        uint256 votes,
        string reason
    );
    
    event ProposalExecuted(uint256 indexed id);
    
    event GovernanceParameterUpdated(string parameter, uint256 oldValue, uint256 newValue);
    
    // 修饰符
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyThreatIntelligenceCoordination() {
        require(msg.sender == threatIntelligenceCoordination, "Only threat intelligence coordination contract can call this function");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _timelock 时间锁合约地址
     * @param _threatIntelligenceCoordination 威胁情报协调合约地址
     */
    constructor(address _timelock, address _threatIntelligenceCoordination) {
        owner = msg.sender;
        timelock = _timelock;
        threatIntelligenceCoordination = _threatIntelligenceCoordination;
        
        // 设置默认治理参数
        proposalThreshold = 1000;     // 大幅降低提案门槛，使更多节点可以提案
        votingDelay = 1;              // 1个区块
        votingPeriod = 40320;         // 约1周（按15秒/区块计算）
        proposalQuorum = 1000;        // 大幅降低法定人数要求
        executionDelay = 43200;       // 12小时（缩短执行延迟）
    }
    
    /**
     * @dev 创建提案
     * @param targets 调用目标地址数组
     * @param values 调用值数组
     * @param calldatas 调用数据数组
     * @param description 提案描述
     * @param proposalType 提案类型
     */
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        ProposalType proposalType
    ) public returns (uint256) {
        require(isValidProposalThreshold(msg.sender), "Proposer below proposal threshold");
        
        uint256 id = ++proposalCount;
        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;
        
        Proposal storage newProposal = proposals[id];
        newProposal.id = id;
        newProposal.proposer = msg.sender;
        newProposal.startTime = startTime;
        newProposal.endTime = endTime;
        newProposal.description = description;
        newProposal.proposalType = proposalType;
        newProposal.state = ProposalState.Pending;
        newProposal.requiredQuorum = proposalQuorum;
        
        // 设置提案执行目标
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.calldatas = calldatas;
        
        emit ProposalCreated(
            id,
            msg.sender,
            targets,
            values,
            new string[](calldatas.length),
            calldatas,
            startTime,
            endTime,
            description
        );
        
        return id;
    }
    
    /**
     * @dev 对提案进行投票
     * @param proposalId 提案ID
     * @param support 支持类型 (0=Against, 1=For, 2=Abstain)
     * @param reason 投票理由
     */
    function castVote(uint256 proposalId, uint8 support, string memory reason) public {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal is not active");
        require(!proposal.votes[msg.sender].hasVoted, "Already voted");
        require(support <= 2, "Invalid vote support value");
        
        uint256 votingPower = getVotingPower(msg.sender, proposal.startTime);
        require(votingPower > 0, "No voting power");
        
        proposal.votes[msg.sender].hasVoted = true;
        proposal.votes[msg.sender].support = support;
        proposal.votes[msg.sender].votes = votingPower;
        
        if (support == 1) {
            proposal.votesFor += votingPower;
        } else if (support == 0) {
            proposal.votesAgainst += votingPower;
        } else if (support == 2) {
            proposal.votesAbstain += votingPower;
        }
        
        emit VoteCast(msg.sender, proposalId, support, votingPower, reason);
    }
    
    /**
     * @dev 对提案进行投票（不带理由）
     * @param proposalId 提案ID
     * @param support 支持类型 (0=Against, 1=For, 2=Abstain)
     */
    function castVote(uint256 proposalId, uint8 support) public {
        castVote(proposalId, support, "");
    }
    
    /**
     * @dev 执行提案
     * @param proposalId 提案ID
     */
    function execute(uint256 proposalId) public payable {
        Proposal storage proposal = proposals[proposalId];
        require(isProposalState(proposalId, ProposalState.Succeeded) || 
                isProposalState(proposalId, ProposalState.Queued), "Proposal not ready for execution");
        
        proposal.state = ProposalState.Executed;
        
        for (uint i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(proposal.calldatas[i]);
            require(success, "Proposal execution failed");
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev 检查提案状态
     * @param proposalId 提案ID
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.endTime > block.timestamp) {
            return ProposalState.Active;
        } else if (proposal.votesFor <= proposal.votesAgainst || 
                  proposal.votesFor + proposal.votesAgainst < proposal.requiredQuorum) {
            return ProposalState.Defeated;
        } else if (!isQueueable(proposalId)) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Queued;
        }
    }
    
    /**
     * @dev 检查提案是否可排队
     * @param proposalId 提案ID
     */
    function isQueueable(uint256 proposalId) public view returns (bool) {
        return block.timestamp >= proposals[proposalId].executionTime;
    }
    
    /**
     * @dev 检查提案状态
     * @param proposalId 提案ID
     * @param targetState 要检查的状态
     */
    function isProposalState(uint256 proposalId, ProposalState targetState) public view returns (bool) {
        return state(proposalId) == targetState;
    }
    
    /**
     * @dev 检查提案人是否达到阈值
     * @param proposer 提案人地址
     */
    function isValidProposalThreshold(address proposer) public view returns (bool) {
        uint256 votingPower = getVotingPower(proposer, block.timestamp);
        return votingPower >= proposalThreshold;
    }
    
    /**
     * @dev 获取投票权（基于节点信誉，更宽松的机制）
     * @param account 账户地址
     */
    function getVotingPower(address account, uint256 /*timestamp*/) public view returns (uint256) {
        // 通过威胁情报协调合约获取节点信誉分数
        // 此处为简化实现，实际应用中可能需要更复杂的逻辑
        (, , , , uint256 reputationScore, , , , ) = 
            ThreatIntelligenceCoordination(threatIntelligenceCoordination).getNodeReputation(account);
        
        // 放宽信誉要求，最低投票权设为10而不是100
        if (reputationScore < 10) {
            return 10;  // 大幅降低最低投票权门槛
        } else if (reputationScore > 1000) {
            return 1000;
        } else {
            return reputationScore;
        }
    }
    
    /**
     * @dev 更新治理参数
     * @param _proposalThreshold 提案阈值
     * @param _votingPeriod 投票期
     * @param _proposalQuorum 提案法定人数
     */
    function updateGovernanceParameters(
        uint256 _proposalThreshold,
        uint256 _votingPeriod,
        uint256 _proposalQuorum
    ) public onlyOwner {
        uint256 oldProposalThreshold = proposalThreshold;
        uint256 oldVotingPeriod = votingPeriod;
        uint256 oldProposalQuorum = proposalQuorum;
        
        proposalThreshold = _proposalThreshold;
        votingPeriod = _votingPeriod;
        proposalQuorum = _proposalQuorum;
        
        emit GovernanceParameterUpdated("proposalThreshold", oldProposalThreshold, _proposalThreshold);
        emit GovernanceParameterUpdated("votingPeriod", oldVotingPeriod, _votingPeriod);
        emit GovernanceParameterUpdated("proposalQuorum", oldProposalQuorum, _proposalQuorum);
    }
    
    /**
     * @dev 紧急暂停治理
     */
    function emergencyPause() public onlyOwner {
        // 在真正的实现中，这里会调用时间锁合约暂停治理功能
        // 简化实现，实际应用中会更复杂
    }
    
    /**
     * @dev 获取提案详细信息
     * @param proposalId 提案ID
     */
    function getProposalDetails(uint256 proposalId) external view returns (
        address proposer,
        uint256 startTime,
        uint256 endTime,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 votesAbstain,
        uint256 requiredQuorum,
        string memory description,
        ProposalType proposalType,
        ProposalState proposalState
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.startTime,
            proposal.endTime,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.votesAbstain,
            proposal.requiredQuorum,
            proposal.description,
            proposal.proposalType,
            proposal.state
        );
    }
}