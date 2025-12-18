// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title OraSRS Governance Contract
 * @notice Implements decentralized governance with timelock and appeal mechanisms
 * @dev Supports developer governance, community voting, and emergency controls
 */
contract OraSRSGovernance {
    // ============ State Variables ============
    
    address public developer;
    uint256 public constant TIMELOCK_DELAY = 24 hours;
    uint256 public constant EMERGENCY_DELAY = 0;
    
    bool public paused;
    
    // Appeal structure
    struct Appeal {
        address appellant;
        string targetIP;
        string evidenceHash;  // IPFS hash
        uint256 timestamp;
        uint256 supportVotes;
        uint256 rejectVotes;
        bool resolved;
        bool approved;
        mapping(address => bool) hasVoted;
    }
    
    // Proposed action structure (for timelock)
    struct ProposedAction {
        bytes32 actionHash;
        uint256 executeTime;
        bool executed;
        bool cancelled;
        string description;
    }
    
    // Node qualification structure
    struct NodeQualification {
        uint256 riskScore;      // 0-100, lower is better
        uint256 uptime;         // seconds
        uint256 reputation;     // 0-100
        bool qualified;
    }
    
    // ============ Mappings ============
    
    mapping(uint256 => Appeal) public appeals;
    mapping(bytes32 => ProposedAction) public proposedActions;
    mapping(address => NodeQualification) public nodes;
    
    uint256 public appealCount;
    
    // ============ Events ============
    
    event AppealSubmitted(uint256 indexed appealID, address indexed appellant, string targetIP, string evidenceHash);
    event VoteCast(uint256 indexed appealID, address indexed voter, bool support);
    event AppealResolved(uint256 indexed appealID, bool approved);
    event ActionProposed(bytes32 indexed actionHash, uint256 executeTime, string description);
    event ActionExecuted(bytes32 indexed actionHash);
    event ActionCancelled(bytes32 indexed actionHash);
    event EmergencyPause(address indexed by);
    event EmergencyUnpause(address indexed by);
    event NodeQualified(address indexed node);
    event NodeDisqualified(address indexed node);
    
    // ============ Modifiers ============
    
    modifier onlyDeveloper() {
        require(msg.sender == developer, "Only developer");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    modifier onlyQualifiedNode() {
        require(nodes[msg.sender].qualified, "Node not qualified");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        developer = msg.sender;
        paused = false;
    }
    
    // ============ Appeal Functions ============
    
    /**
     * @notice Submit an appeal for a high-risk IP
     * @param targetIP The IP address being appealed
     * @param evidenceHash IPFS hash of evidence
     */
    function submitAppeal(string memory targetIP, string memory evidenceHash) 
        external 
        whenNotPaused 
        returns (uint256) 
    {
        appealCount++;
        Appeal storage appeal = appeals[appealCount];
        appeal.appellant = msg.sender;
        appeal.targetIP = targetIP;
        appeal.evidenceHash = evidenceHash;
        appeal.timestamp = block.timestamp;
        appeal.resolved = false;
        appeal.approved = false;
        
        emit AppealSubmitted(appealCount, msg.sender, targetIP, evidenceHash);
        return appealCount;
    }
    
    /**
     * @notice Cast a vote on an appeal (only qualified nodes)
     * @param appealID The ID of the appeal
     * @param support True to support, false to reject
     */
    function castVote(uint256 appealID, bool support) 
        external 
        whenNotPaused 
        onlyQualifiedNode 
    {
        Appeal storage appeal = appeals[appealID];
        require(!appeal.resolved, "Appeal already resolved");
        require(!appeal.hasVoted[msg.sender], "Already voted");
        
        appeal.hasVoted[msg.sender] = true;
        
        if (support) {
            appeal.supportVotes++;
        } else {
            appeal.rejectVotes++;
        }
        
        emit VoteCast(appealID, msg.sender, support);
        
        // Auto-resolve if threshold reached (e.g., 3 votes)
        if (appeal.supportVotes + appeal.rejectVotes >= 3) {
            _resolveAppeal(appealID);
        }
    }
    
    /**
     * @notice Resolve an appeal based on votes
     * @param appealID The ID of the appeal
     */
    function _resolveAppeal(uint256 appealID) internal {
        Appeal storage appeal = appeals[appealID];
        require(!appeal.resolved, "Appeal already resolved");
        
        appeal.resolved = true;
        appeal.approved = appeal.supportVotes > appeal.rejectVotes;
        
        emit AppealResolved(appealID, appeal.approved);
    }
    
    /**
     * @notice Manually resolve an appeal (developer only)
     * @param appealID The ID of the appeal
     */
    function resolveAppeal(uint256 appealID) external onlyDeveloper {
        _resolveAppeal(appealID);
    }
    
    // ============ Timelock Functions ============
    
    /**
     * @notice Propose an action with timelock
     * @param action The action data
     * @param description Description of the action
     */
    function proposeAction(bytes memory action, string memory description) 
        external 
        onlyDeveloper 
        returns (bytes32) 
    {
        bytes32 actionHash = keccak256(action);
        require(proposedActions[actionHash].executeTime == 0, "Action already proposed");
        
        ProposedAction storage proposal = proposedActions[actionHash];
        proposal.actionHash = actionHash;
        proposal.executeTime = block.timestamp + TIMELOCK_DELAY;
        proposal.executed = false;
        proposal.cancelled = false;
        proposal.description = description;
        
        emit ActionProposed(actionHash, proposal.executeTime, description);
        return actionHash;
    }
    
    /**
     * @notice Execute a proposed action after timelock
     * @param action The action data
     */
    function executeAction(bytes memory action) external onlyDeveloper {
        bytes32 actionHash = keccak256(action);
        ProposedAction storage proposal = proposedActions[actionHash];
        
        require(proposal.executeTime > 0, "Action not proposed");
        require(block.timestamp >= proposal.executeTime, "Timelock not expired");
        require(!proposal.executed, "Action already executed");
        require(!proposal.cancelled, "Action cancelled");
        
        proposal.executed = true;
        
        // Execute the action (simplified - in production, decode and execute)
        // (bool success,) = address(this).call(action);
        // require(success, "Action execution failed");
        
        emit ActionExecuted(actionHash);
    }
    
    /**
     * @notice Cancel a proposed action
     * @param actionHash The hash of the action
     */
    function cancelAction(bytes32 actionHash) external onlyDeveloper {
        ProposedAction storage proposal = proposedActions[actionHash];
        require(proposal.executeTime > 0, "Action not proposed");
        require(!proposal.executed, "Action already executed");
        
        proposal.cancelled = true;
        emit ActionCancelled(actionHash);
    }
    
    // ============ Emergency Functions ============
    
    /**
     * @notice Emergency pause (immediate effect)
     */
    function emergencyPause() external onlyDeveloper {
        paused = true;
        emit EmergencyPause(msg.sender);
    }
    
    /**
     * @notice Emergency unpause
     */
    function emergencyUnpause() external onlyDeveloper {
        paused = false;
        emit EmergencyUnpause(msg.sender);
    }
    
    // ============ Node Qualification Functions ============
    
    /**
     * @notice Update node qualification
     * @param node The node address
     * @param riskScore Risk score (0-100, lower is better)
     * @param uptime Uptime in seconds
     * @param reputation Reputation score (0-100)
     */
    function updateNodeQualification(
        address node,
        uint256 riskScore,
        uint256 uptime,
        uint256 reputation
    ) external onlyDeveloper {
        NodeQualification storage qual = nodes[node];
        qual.riskScore = riskScore;
        qual.uptime = uptime;
        qual.reputation = reputation;
        
        // Qualification criteria:
        // - Risk score < 10
        // - Uptime >= 72 hours (259200 seconds)
        // - Reputation >= 60
        bool wasQualified = qual.qualified;
        qual.qualified = (riskScore < 10 && uptime >= 259200 && reputation >= 60);
        
        if (qual.qualified && !wasQualified) {
            emit NodeQualified(node);
        } else if (!qual.qualified && wasQualified) {
            emit NodeDisqualified(node);
        }
    }
    
    /**
     * @notice Check if a node is qualified
     * @param node The node address
     */
    function isNodeQualified(address node) external view returns (bool) {
        return nodes[node].qualified;
    }
    
    /**
     * @notice Get appeal details
     * @param appealID The ID of the appeal
     */
    function getAppeal(uint256 appealID) external view returns (
        address appellant,
        string memory targetIP,
        string memory evidenceHash,
        uint256 timestamp,
        uint256 supportVotes,
        uint256 rejectVotes,
        bool resolved,
        bool approved
    ) {
        Appeal storage appeal = appeals[appealID];
        return (
            appeal.appellant,
            appeal.targetIP,
            appeal.evidenceHash,
            appeal.timestamp,
            appeal.supportVotes,
            appeal.rejectVotes,
            appeal.resolved,
            appeal.approved
        );
    }
    
    /**
     * @notice Check if an address has voted on an appeal
     * @param appealID The ID of the appeal
     * @param voter The voter address
     */
    function hasVoted(uint256 appealID, address voter) external view returns (bool) {
        return appeals[appealID].hasVoted[voter];
    }
}