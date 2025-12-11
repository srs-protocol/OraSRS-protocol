// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OraSRSToken is ERC20, Ownable {
    // 构造函数：初始化代币名称和符号
    // Ownable(msg.sender) 确保部署者是管理员
    constructor() ERC20("OraSRS Protocol Token", "ORA") Ownable(msg.sender) {
        // 初始铸造 1亿 枚代币给部署者
        // 18 是默认精度，所以要乘以 10^18
        _mint(msg.sender, 100000000 * 10 ** decimals());
    }

    // 这是一个"水龙头"函数，仅用于测试网！
    // 允许管理员给任意地址发币
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}