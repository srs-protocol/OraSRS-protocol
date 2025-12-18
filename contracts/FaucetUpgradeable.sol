// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleFaucetUpgradeable
 * @dev 简化版水龙头合约
 */
contract FaucetUpgradeable is Ownable {
    IERC20 public oraToken;
    
    // 每次领取的代币数量 (可修改)
    uint256 public withdrawAmount;
    
    // 每个地址的冷却时间 (可修改)
    uint256 public cooldownPeriod;
    
    // 记录每个地址的最后领取时间
    mapping(address => uint256) public lastWithdrawal;
    
    // 事件
    event TokensWithdrawn(address indexed recipient, uint256 amount);
    event TokensDeposited(address indexed sender, uint256 amount);
    event WithdrawalLimitChanged(uint256 newLimit);
    event CooldownPeriodChanged(uint256 newPeriod);
    
    /**
     * @dev 构造函数
     * @param _oraToken ORA代币合约地址
     */
    constructor(address _oraToken) Ownable(msg.sender) {
        require(_oraToken != address(0), "Token address cannot be zero");
        oraToken = IERC20(_oraToken);
        
        // 设置默认值
        withdrawAmount = 1000 * 10**18; // 1000 ORA
        cooldownPeriod = 1 days; // 24小时
    }
    
    /**
     * @dev 领取代币
     */
    function withdrawTokens() external {
        require(
            lastWithdrawal[msg.sender] + cooldownPeriod <= block.timestamp,
            "Must wait for cooldown period"
        );
        
        require(
            oraToken.balanceOf(address(this)) >= withdrawAmount,
            "Insufficient faucet balance"
        );
        
        lastWithdrawal[msg.sender] = block.timestamp;
        
        bool success = oraToken.transfer(msg.sender, withdrawAmount);
        require(success, "Transfer failed");
        
        emit TokensWithdrawn(msg.sender, withdrawAmount);
    }
    
    /**
     * @dev 批量向多个地址分发代币（仅限所有者）
     * @param recipients 接收者地址数组
     */
    function batchDistribute(address[] calldata recipients) external onlyOwner {
        uint256 totalAmount = withdrawAmount * recipients.length;
        
        require(
            oraToken.balanceOf(address(this)) >= totalAmount,
            "Insufficient faucet balance"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            require(
                lastWithdrawal[recipient] + cooldownPeriod <= block.timestamp,
                "Recipient must wait for cooldown period"
            );
            
            lastWithdrawal[recipient] = block.timestamp;
            
            bool success = oraToken.transfer(recipient, withdrawAmount);
            require(success, "Transfer failed");
            
            emit TokensWithdrawn(recipient, withdrawAmount);
        }
    }
    
    /**
     * @dev 向水龙头存入代币
     * @param amount 存入数量
     */
    function depositTokens(uint256 amount) external onlyOwner {
        bool success = oraToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Deposit failed");
        
        emit TokensDeposited(msg.sender, amount);
    }
    
    /**
     * @dev 从水龙头提取代币（仅限所有者）
     * @param amount 提取数量
     */
    function withdrawFaucetBalance(uint256 amount) external onlyOwner {
        bool success = oraToken.transfer(msg.sender, amount);
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev 检查某个地址是否可以领取代币
     * @param account 账户地址
     */
    function canWithdraw(address account) external view returns (bool) {
        return lastWithdrawal[account] + cooldownPeriod <= block.timestamp;
    }
    
    /**
     * @dev 获取账户还需等待的时间
     * @param account 账户地址
     */
    function timeToNextWithdraw(address account) external view returns (uint256) {
        if (lastWithdrawal[account] + cooldownPeriod <= block.timestamp) {
            return 0;
        }
        return lastWithdrawal[account] + cooldownPeriod - block.timestamp;
    }
    
    /**
     * @dev 更新每次领取的代币数量（仅限所有者）
     * @param newAmount 新的领取数量
     */
    function setWithdrawAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Amount must be greater than 0");
        uint256 oldAmount = withdrawAmount;
        withdrawAmount = newAmount;
        emit WithdrawalLimitChanged(newAmount);
    }
    
    /**
     * @dev 更新冷却时间（仅限所有者）
     * @param newPeriod 新的冷却时间
     */
    function setCooldownPeriod(uint256 newPeriod) external onlyOwner {
        cooldownPeriod = newPeriod;
        emit CooldownPeriodChanged(newPeriod);
    }
    
    /**
     * @dev 获取水龙头余额
     */
    function faucetBalance() external view returns (uint256) {
        return oraToken.balanceOf(address(this));
    }
    
    /**
     * @dev Fallback function to receive ETH if needed
     */
    receive() external payable {}
    
    /**
     * @dev Withdraw ETH from the contract (if any)
     */
    function withdrawETH() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }
}