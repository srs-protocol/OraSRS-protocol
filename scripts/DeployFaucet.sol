// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 部署脚本 - 用于部署OraSRS水龙头合约
// 首先需要部署OraSRSToken，然后部署Faucet合约

import "../contracts/OraSRSToken.sol";
import "../contracts/Faucet.sol";

contract DeployFaucet {
    OraSRSToken public oraToken;
    FaucetUpgradeable public faucet;
    
    constructor() {
        // 部署ORA代币合约
        oraToken = new OraSRSToken();
        
        // 部署水龙头合约，传入ORA代币地址
        faucet = new FaucetUpgradeable(address(oraToken));
        
        // 将一部分代币发送到水龙头合约
        uint256 faucetInitialBalance = 1000000 * 10**18; // 100万ORA代币
        oraToken.transfer(address(faucet), faucetInitialBalance);
    }
    
    function getOraTokenAddress() external view returns (address) {
        return address(oraToken);
    }
    
    function getFaucetAddress() external view returns (address) {
        return address(faucet);
    }
}