// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleSecurityActionContract
 * @dev 简化的安全操作合约，用于管理IP和域名阻断
 */
contract SimpleSecurityActionContract is Ownable, ReentrancyGuard {
    // 存储映射
    mapping(string => bool) public ipBlocked;      // IP阻断状态
    mapping(string => bool) public domainBlocked;  // 域名阻断状态
    
    // 治理合约地址
    address public governanceContract;
    
    // 事件
    event IPBlocked(string indexed ip, address executor, uint256 timestamp);
    event IPUnblocked(string indexed ip, address executor, uint256 timestamp);
    event DomainBlocked(string indexed domain, address executor, uint256 timestamp);
    event DomainUnblocked(string indexed domain, address executor, uint256 timestamp);
    event GovernanceContractUpdated(address oldGovernance, address newGovernance);
    
    // 修饰符
    modifier onlyAuthorized() {
        require(msg.sender == governanceContract || msg.sender == owner(), "Only authorized can call this function");
        _;
    }
    
    /**
     * @dev 构造函数
     * @param _governanceContract 治理合约地址
     */
    constructor(address _governanceContract) Ownable(msg.sender) {
        // 如果没有提供治理合约地址，使用部署者地址作为治理合约
        governanceContract = _governanceContract != address(0) ? _governanceContract : msg.sender;
    }
    
    /**
     * @dev 阻断IP地址
     * @param _ip IP地址
     */
    function blockIP(string memory _ip) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(bytes(_ip).length > 0, "IP cannot be empty");
        ipBlocked[_ip] = true;
        emit IPBlocked(_ip, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 解除IP阻断
     * @param _ip IP地址
     */
    function unblockIP(string memory _ip) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(ipBlocked[_ip], "IP is not blocked");
        ipBlocked[_ip] = false;
        emit IPUnblocked(_ip, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 阻断域名
     * @param _domain 域名
     */
    function blockDomain(string memory _domain) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(bytes(_domain).length > 0, "Domain cannot be empty");
        domainBlocked[_domain] = true;
        emit DomainBlocked(_domain, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 解除域名阻断
     * @param _domain 域名
     */
    function unblockDomain(string memory _domain) 
        external 
        onlyAuthorized 
        nonReentrant 
    {
        require(domainBlocked[_domain], "Domain is not blocked");
        domainBlocked[_domain] = false;
        emit DomainUnblocked(_domain, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 检查IP是否被阻断
     * @param _ip IP地址
     */
    function isIPBlocked(string memory _ip) external view returns (bool) {
        return ipBlocked[_ip];
    }
    
    /**
     * @dev 检查域名是否被阻断
     * @param _domain 域名
     */
    function isDomainBlocked(string memory _domain) external view returns (bool) {
        return domainBlocked[_domain];
    }
    
    /**
     * @dev 更新治理合约地址
     * @param _newGovernanceContract 新治理合约地址
     */
    function updateGovernanceContract(address _newGovernanceContract) external onlyOwner {
        require(_newGovernanceContract != address(0), "New governance contract cannot be zero address");
        address oldGovernance = governanceContract;
        governanceContract = _newGovernanceContract;
        
        emit GovernanceContractUpdated(oldGovernance, _newGovernanceContract);
    }
}