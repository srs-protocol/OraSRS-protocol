// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/**
 * @title Gas Subsidy Contract
 * @notice Provides initial gas subsidy to new nodes (1 ORA)
 */
contract GasSubsidy {
    uint256 public constant SUBSIDY_AMOUNT = 1 ether; // 1 ORA
    mapping(address => bool) public hasReceivedSubsidy;
    
    address public owner;
    
    event SubsidyRequested(address indexed user, uint256 amount);
    
    constructor() payable {
        owner = msg.sender;
    }
    
    /**
     * @notice Request gas subsidy (once per address)
     */
    function requestSubsidy() external {
        require(!hasReceivedSubsidy[msg.sender], "Already received subsidy");
        require(address(this).balance >= SUBSIDY_AMOUNT, "Insufficient contract balance");
        
        hasReceivedSubsidy[msg.sender] = true;
        
        (bool success, ) = msg.sender.call{value: SUBSIDY_AMOUNT}("");
        require(success, "Transfer failed");
        
        emit SubsidyRequested(msg.sender, SUBSIDY_AMOUNT);
    }
    
    /**
     * @notice Request gas subsidy for another address (relayer pattern)
     */
    function requestSubsidyFor(address user) external {
        require(!hasReceivedSubsidy[user], "Already received subsidy");
        require(address(this).balance >= SUBSIDY_AMOUNT, "Insufficient contract balance");
        
        hasReceivedSubsidy[user] = true;
        
        (bool success, ) = user.call{value: SUBSIDY_AMOUNT}("");
        require(success, "Transfer failed");
        
        emit SubsidyRequested(user, SUBSIDY_AMOUNT);
    }
    
    /**
     * @notice Owner can fund the contract
     */
    function fund() external payable {
        require(msg.value > 0, "Must send ORA");
    }
    
    /**
     * @notice Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {}
}

/**
 * @title Token Faucet Contract
 * @notice Provides test tokens to new nodes (1000 ORA)
 */
contract TokenFaucet {
    uint256 public constant FAUCET_AMOUNT = 1000 ether; // 1000 ORA
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public balances;
    
    uint256 public totalSupply;
    string public name = "OraSRS Test Token";
    string public symbol = "ORA";
    uint8 public decimals = 18;
    
    event Claimed(address indexed user, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 value);
    
    constructor() {
        // Mint initial supply to contract
        totalSupply = 1000000 ether; // 1M ORA
        balances[address(this)] = totalSupply;
    }
    
    /**
     * @notice Claim faucet tokens (once per address)
     */
    function claim() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(balances[address(this)] >= FAUCET_AMOUNT, "Faucet empty");
        
        hasClaimed[msg.sender] = true;
        balances[address(this)] -= FAUCET_AMOUNT;
        balances[msg.sender] += FAUCET_AMOUNT;
        
        emit Claimed(msg.sender, FAUCET_AMOUNT);
        emit Transfer(address(this), msg.sender, FAUCET_AMOUNT);
    }
    
    /**
     * @notice Get balance of an account
     */
    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
    
    /**
     * @notice Transfer tokens
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}

/**
 * @title Node Registry Contract
 * @notice Manages OraSRS node registration
 */
contract NodeRegistry {
    struct NodeInfo {
        string nodeId;
        string endpoint;
        uint256 registeredAt;
        bool active;
        uint256 reputation;
        uint256 uptime;
    }
    
    mapping(address => NodeInfo) public nodes;
    mapping(string => address) public nodeIdToAddress;
    address[] public nodeList;
    
    uint256 public totalNodes;
    
    event NodeRegistered(address indexed nodeAddress, string nodeId, string endpoint);
    event NodeUpdated(address indexed nodeAddress, string endpoint);
    event NodeDeactivated(address indexed nodeAddress);
    event ReputationUpdated(address indexed nodeAddress, uint256 newReputation);
    
    /**
     * @notice Register a new node
     */
    function registerNode(string memory nodeId, string memory endpoint) external {
        require(!isNodeRegistered(msg.sender), "Node already registered");
        require(nodeIdToAddress[nodeId] == address(0), "Node ID already taken");
        require(bytes(nodeId).length > 0, "Node ID required");
        require(bytes(endpoint).length > 0, "Endpoint required");
        
        nodes[msg.sender] = NodeInfo({
            nodeId: nodeId,
            endpoint: endpoint,
            registeredAt: block.timestamp,
            active: true,
            reputation: 50, // Start with neutral reputation
            uptime: 0
        });
        
        nodeIdToAddress[nodeId] = msg.sender;
        nodeList.push(msg.sender);
        totalNodes++;
        
        emit NodeRegistered(msg.sender, nodeId, endpoint);
    }
    
    /**
     * @notice Update node endpoint
     */
    function updateEndpoint(string memory newEndpoint) external {
        require(isNodeRegistered(msg.sender), "Node not registered");
        require(bytes(newEndpoint).length > 0, "Endpoint required");
        
        nodes[msg.sender].endpoint = newEndpoint;
        
        emit NodeUpdated(msg.sender, newEndpoint);
    }
    
    /**
     * @notice Deactivate node
     */
    function deactivateNode() external {
        require(isNodeRegistered(msg.sender), "Node not registered");
        
        nodes[msg.sender].active = false;
        
        emit NodeDeactivated(msg.sender);
    }
    
    /**
     * @notice Update node reputation (governance only)
     */
    function updateReputation(address nodeAddress, uint256 newReputation) external {
        require(isNodeRegistered(nodeAddress), "Node not registered");
        require(newReputation <= 100, "Reputation must be 0-100");
        
        nodes[nodeAddress].reputation = newReputation;
        
        emit ReputationUpdated(nodeAddress, newReputation);
    }
    
    /**
     * @notice Update node uptime
     */
    function updateUptime(address nodeAddress, uint256 uptimeSeconds) external {
        require(isNodeRegistered(nodeAddress), "Node not registered");
        
        nodes[nodeAddress].uptime = uptimeSeconds;
    }
    
    /**
     * @notice Check if node is registered
     */
    function isNodeRegistered(address nodeAddress) public view returns (bool) {
        return nodes[nodeAddress].registeredAt > 0;
    }
    
    /**
     * @notice Get node info
     */
    function getNodeInfo(address nodeAddress) external view returns (
        string memory nodeId,
        string memory endpoint,
        uint256 registeredAt,
        bool active
    ) {
        NodeInfo memory node = nodes[nodeAddress];
        return (node.nodeId, node.endpoint, node.registeredAt, node.active);
    }
    
    /**
     * @notice Get all active nodes
     */
    function getActiveNodes() external view returns (address[] memory) {
        uint256 activeCount = 0;
        
        // Count active nodes
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (nodes[nodeList[i]].active) {
                activeCount++;
            }
        }
        
        // Build active nodes array
        address[] memory activeNodes = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (nodes[nodeList[i]].active) {
                activeNodes[index] = nodeList[i];
                index++;
            }
        }
        
        return activeNodes;
    }
    
    /**
     * @notice Get total active nodes count
     */
    function getActiveNodeCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < nodeList.length; i++) {
            if (nodes[nodeList[i]].active) {
                count++;
            }
        }
        return count;
    }
}
