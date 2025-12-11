// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title OraSRSToken
 * @dev OraSRS Protocol 代币合约
 * @notice 这是 OraSRS 协议的治理代币
 */
contract OraSRSToken is ERC20, Ownable, ERC20Burnable {
    uint8 private constant _DECIMALS = 18;
    uint256 private constant _INITIAL_SUPPLY = 100_000_000 * 10 ** _DECIMALS; // 1亿枚代币

    /**
     * @dev 构造函数
     * @notice 初始化代币名称、符号和初始供应量
     */
    constructor() ERC20("OraSRS Protocol Token", "ORA") Ownable(msg.sender) {
        _mint(msg.sender, _INITIAL_SUPPLY);
    }

    /**
     * @dev 铸造新代币
     * @param to 接收地址
     * @param amount 铸造数量
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev 返回代币精度
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
}