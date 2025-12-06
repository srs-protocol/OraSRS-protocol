# OraSRS 代币合约

## 在Remix中部署

要使用Remix IDE部署此合约，请按照以下步骤操作：

1. 访问 [Remix IDE](https://remix.ethereum.org/)
2. 创建一个新文件，命名为`OraSRSToken.sol`
3. 将以下代码粘贴到文件中：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract OraSRSToken is ERC20, Ownable {
    constructor() ERC20("OraSRS Protocol Token", "ORA") Ownable(msg.sender) {
        _mint(msg.sender, 100000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

4. 在Remix中安装OpenZeppelin合约：
   - 在左侧导航栏点击"Solidity"图标
   - 点击"OpenZeppelin Contracts"
   - 选择合适的版本并导入`ERC20.sol`和`Ownable.sol`

5. 编译合约：
   - 选择右侧的"Solidity Compiler"插件
   - 选择编译器版本为`0.8.20`
   - 点击"Compile OraSRSToken.sol"

6. 部署合约：
   - 选择右侧的"Deploy & Run Transactions"插件
   - 在Environment下拉菜单中选择"Injected Provider - MetaMask"
   - 确保您的MetaMask钱包已连接到Optimism Sepolia网络
   - 选择OraSRSToken合约
   - 点击"Deploy"

## 合约特点

- 标准ERC-20代币
- 1亿枚预挖代币（分配给部署者）
- 管理员可铸币功能（仅测试网使用）
- 符合以太坊和L2网络标准