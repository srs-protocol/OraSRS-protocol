// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GasSubsidy is Ownable, ReentrancyGuard {
    // === 状态变量 ===
    
    // 每次补贴的 Gas 金额 (例如 1 ORA)
    uint256 public subsidyAmount = 1 ether;
    
    // 记录已领取的地址 (防止重复领取)
    mapping(address => bool) public hasClaimed;
    
    // 授权的中继器地址 (你的服务器钱包)
    address public relayerAddress;

    // === 事件 ===
    event GasSubsidized(address indexed user, uint256 amount);
    event RelayerUpdated(address indexed newRelayer);
    event SubsidyAmountUpdated(uint256 newAmount);

    // === 构造函数 ===
    constructor(address _initialOwner, address _relayer) Ownable(_initialOwner) {
        relayerAddress = _relayer;
    }

    // === 修饰符 ===
    modifier onlyRelayerOrOwner() {
        require(msg.sender == relayerAddress || msg.sender == owner(), "Not authorized");
        _;
    }

    // === 核心功能 ===

    /**
     * @dev 给指定用户发放 Gas 补贴
     * @param _user 目标新用户地址
     * 注意：只有服务器(Relayer)能调用此函数，这样我们可以在链下做 IP 验证和防刷
     */
    function subsidize(address _user) external nonReentrant onlyRelayerOrOwner {
        require(_user != address(0), "Invalid address");
        require(!hasClaimed[_user], "User already claimed subsidy");
        require(address(this).balance >= subsidyAmount, "Insufficient subsidy funds");

        // 1. 标记为已领取
        hasClaimed[_user] = true;

        // 2. 发送原生代币 (ORA)
        (bool sent, ) = _user.call{value: subsidyAmount}("");
        require(sent, "Failed to send Ether");

        emit GasSubsidized(_user, subsidyAmount);
    }

    /**
     * @dev 批量发放 (用于活动或空投)
     */
    function batchSubsidize(address[] calldata _users) external onlyRelayerOrOwner {
        for (uint i = 0; i < _users.length; i++) {
            if (!hasClaimed[_users[i]] && address(this).balance >= subsidyAmount) {
                hasClaimed[_users[i]] = true;
                (bool sent, ) = payable(_users[i]).call{value: subsidyAmount}("");
                require(sent, "Failed to send Ether");
                emit GasSubsidized(_users[i], subsidyAmount);
            }
        }
    }

    // === 管理功能 ===

    // 协议金库向此合约充值
    receive() external payable {}

    function setRelayer(address _newRelayer) external onlyOwner {
        relayerAddress = _newRelayer;
        emit RelayerUpdated(_newRelayer);
    }

    function setSubsidyAmount(uint256 _amount) external onlyOwner {
        subsidyAmount = _amount;
        emit SubsidyAmountUpdated(_amount);
    }

    // 紧急提现 (防止资金锁死)
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }
}