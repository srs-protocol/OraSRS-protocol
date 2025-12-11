// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OraSRSGovernance
 * @dev OraSRS协议治理合约，用于管理协议参数和关键决策
 */
contract OraSRSGovernance is Ownable, ReentrancyGuard {
    // 提案状态
    enum ProposalState { 
        Pending,     // 待处理
        Active,      // 激活（正在投票）
        Canceled,    // 已取消
        Defeated,    // 已否决
        Succeeded,   // 已通过
        Queued,      // 已排队
        Executed     // 已执行
    }
    
    // 提案类型
    enum ProposalType {
        ParameterUpdate,     // 参数更新
        ContractUpgrade,     // 合约升级
        EmergencyAction,     // 紧急操作
        NodeManagement,      // 节点管理
        ThreatIntelSync,     // 威胁情报同步
        TreasuryManagement   // 财政管理
    }

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
        mapping(address => bool) hasVoted;
    }

    // 投票结构
    struct Vote {
        bool hasVoted;
        uint8 support;  // 0=Against, 1=For, 2=Abstain
        uint256 votes;
    }

    // 存储变量
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    
    // 治理相关地址
    address public timelock;
    address public threatIntelligenceCoordination;
    
    // 治理参数
    uint256 public votingPeriod;  // 投票期（秒）
    uint256 public proposalThreshold;  // 提案门槛（代币数量）
    uint256 public quorumPercentage;   // 法定人数百分比（百万分之一）
    
    // 事件
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string description,
        ProposalType indexed proposalType
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint8 support,
        uint256 votes
    );
    event ProposalExecuted(uint256 indexed id);
    event GovernanceParameterUpdated(string parameter, uint256 value);
    event GovernanceAddressUpdated(string contractName, address oldAddress, address newAddress);

    /**
     * @dev 构造函数
     * @param _timelock timelock合约地址
     * @param _threatIntelligenceCoordination 威胁情报协调合约地址
     */
    constructor(address _timelock, address _threatIntelligenceCoordination) Ownable(msg.sender) {
        timelock = _timelock;
        threatIntelligenceCoordination = _threatIntelligenceCoordination;
        
        // 设置默认治理参数
        votingPeriod = 7 days;  // 7天投票期
        proposalThreshold = 10000 * 10**18;  // 10,000 ORA代币门槛
        quorumPercentage = 100000;  // 10% 法定人数（百万分之一）
    }

    /**
     * @dev 创建提案
     */
    function createProposal(
        string memory description,
        ProposalType proposalType,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) external returns (uint256) {
        // TODO: 检查提案者是否有足够投票权
        require(bytes(description).length > 0, "Description cannot be empty");
        require(targets.length == values.length && targets.length == calldatas.length, 
                "Array lengths must match");

        uint256 newProposalId = ++proposalCount;
        
        Proposal storage newProposal = proposals[newProposalId];
        newProposal.id = newProposalId;
        newProposal.proposer = msg.sender;
        newProposal.startTime = block.timestamp;
        newProposal.endTime = block.timestamp + votingPeriod;
        newProposal.votesFor = 0;
        newProposal.votesAgainst = 0;
        newProposal.votesAbstain = 0;
        newProposal.requiredQuorum = quorumPercentage;
        newProposal.description = description;
        newProposal.proposalType = proposalType;
        newProposal.state = ProposalState.Pending;
        newProposal.targets = targets;
        newProposal.values = values;
        newProposal.calldatas = calldatas;

        // 根据提案类型设置初始状态
        newProposal.state = ProposalState.Active;

        emit ProposalCreated(newProposalId, msg.sender, description, proposalType);

        return newProposalId;
    }

    /**
     * @dev 投票
     */
    function castVote(uint256 proposalId, uint8 support) external nonReentrant {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal id");
        require(support <= 2, "Invalid vote support value");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal is not active");
        require(block.timestamp <= proposal.endTime, "Voting period has ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        // 标记已投票
        proposal.hasVoted[msg.sender] = true;
        
        // 记录投票（简化：使用固定权重）
        Vote storage vote = votes[proposalId][msg.sender];
        vote.hasVoted = true;
        vote.support = support;
        vote.votes = 100; // 简化：固定票数

        // 更新计票
        if (support == 1) {
            proposal.votesFor += 100;
        } else if (support == 0) {
            proposal.votesAgainst += 100;
        } else if (support == 2) {
            proposal.votesAbstain += 100;
        }

        emit VoteCast(proposalId, msg.sender, support, 100);
    }

    /**
     * @dev 获取提案详情
     */
    function getProposalDetails(uint256 proposalId) 
        external 
        view 
        returns (
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            string memory,
            ProposalType,
            ProposalState
        ) 
    {
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

    /**
     * @dev 获取提案状态
     */
    function state(uint256 proposalId) external view returns (ProposalState) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.endTime < block.timestamp) {
            // 检查是否通过
            if (proposal.votesFor > proposal.votesAgainst && 
                (proposal.votesFor + proposal.votesAgainst) >= proposal.requiredQuorum) {
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Defeated;
            }
        }
        
        return proposal.state;
    }

    /**
     * @dev 更新timelock合约地址
     */
    function updateTimelock(address _newTimelock) external onlyOwner {
        require(_newTimelock != address(0), "Invalid timelock address");
        address oldTimelock = timelock;
        timelock = _newTimelock;
        emit GovernanceAddressUpdated("Timelock", oldTimelock, _newTimelock);
    }

    /**
     * @dev 更新威胁情报协调合约地址
     */
    function updateThreatIntelligenceCoordination(address _newContract) external onlyOwner {
        require(_newContract != address(0), "Invalid contract address");
        address oldContract = threatIntelligenceCoordination;
        threatIntelligenceCoordination = _newContract;
        emit GovernanceAddressUpdated("ThreatIntelligenceCoordination", oldContract, _newContract);
    }

    /**
     * @dev 更新投票期
     */
    function updateVotingPeriod(uint256 _newVotingPeriod) external onlyOwner {
        require(_newVotingPeriod > 0, "Voting period must be greater than 0");
        votingPeriod = _newVotingPeriod;
        emit GovernanceParameterUpdated("VotingPeriod", _newVotingPeriod);
    }

    /**
     * @dev 更新提案门槛
     */
    function updateProposalThreshold(uint256 _newThreshold) external onlyOwner {
        proposalThreshold = _newThreshold;
        emit GovernanceParameterUpdated("ProposalThreshold", _newThreshold);
    }

    /**
     * @dev 更新法定人数百分比
     */
    function updateQuorumPercentage(uint256 _newQuorumPercentage) external onlyOwner {
        require(_newQuorumPercentage <= 1000000, "Quorum cannot exceed 100%");
        quorumPercentage = _newQuorumPercentage;
        emit GovernanceParameterUpdated("QuorumPercentage", _newQuorumPercentage);
    }
    
    /**
     * @dev 销毁合约（仅所有者）
     * 这将把合约余额发送到指定地址并删除合约
     */
    function destroy() external onlyOwner {
        emit ProposalExecuted(block.timestamp); // 记录最后操作
        selfdestruct(payable(owner()));
    }
    
    /**
     * @dev 销毁合约并发送余额到指定地址（仅所有者）
     */
    function destroyAndSendTo(address payable _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid recipient address");
        emit ProposalExecuted(block.timestamp); // 记录最后操作
        selfdestruct(_recipient);
    }
}