// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {OraSRSToken} from "../contracts/OraSRSToken.sol";
import {FaucetUpgradeable} from "./SimpleFaucet.sol";

contract DeployFaucetScript is Script {
    function run() external {
        vm.startBroadcast();
        
        // 部署ORA代币合约
        OraSRSToken oraToken = new OraSRSToken();
        console.log("ORA Token deployed at:", address(oraToken));
        
        // 部署水龙头合约
        FaucetUpgradeable faucet = new FaucetUpgradeable(address(oraToken));
        console.log("Faucet deployed at:", address(faucet));
        
        // 向水龙头转移代币
        uint256 faucetInitialBalance = 1000000 * 10**18; // 100万代币
        oraToken.transfer(address(faucet), faucetInitialBalance);
        console.log("Transferred tokens to faucet");
        
        vm.stopBroadcast();
        
        console.log("=== Deployment Completed ===");
        console.log("ORA Token Address:", address(oraToken));
        console.log("Faucet Address:", address(faucet));
        console.log("Initial Faucet Balance:", faucetInitialBalance / 10**18, "ORA");
    }
}