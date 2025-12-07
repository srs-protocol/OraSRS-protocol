// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/EnhancedThreatVerification.sol";
import "../contracts/OraSRSToken.sol";

contract EnhancedThreatVerificationTest is Test {
    EnhancedThreatVerification public verification;
    OraSRSToken public token;
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public governanceAddr = address(4);

    function setUp() public {
        vm.prank(owner);
        token = new OraSRSToken();
        
        vm.prank(owner);
        verification = new EnhancedThreatVerification(governanceAddr, address(token));
        
        // 给用户一些代币用于质押
        vm.prank(owner);
        token.transfer(user1, 10000 * 10 ** 18);
        
        vm.prank(user1);
        token.approve(address(verification), 10000 * 10 ** 18);
    }

    function testStake() public {
        uint256 initialBalance = token.balanceOf(user1);
        
        vm.prank(user1);
        verification.stake(1000 * 10 ** 18);
        
        assertEq(verification.stakedBalance(user1), 1000 * 10 ** 18);
        assertEq(token.balanceOf(user1), initialBalance - 1000 * 10 ** 18);
        assertEq(token.balanceOf(address(verification)), 1000 * 10 ** 18);
    }

    function testUnstake() public {
        // 先质押
        vm.prank(user1);
        verification.stake(1000 * 10 ** 18);
        
        uint256 initialBalance = token.balanceOf(user1);
        
        // 取消质押
        vm.prank(user1);
        verification.unstake(500 * 10 ** 18);
        
        assertEq(verification.stakedBalance(user1), 500 * 10 ** 18);
        assertEq(token.balanceOf(user1), initialBalance + 500 * 10 ** 18);
    }

    function testDistributeReward() public {
        vm.prank(owner);
        token.transfer(address(verification), 5000 * 10 ** 18);
        
        uint256 initialBalance = token.balanceOf(user1);
        
        vm.prank(governanceAddr);
        verification.distributeReward(user1, 100 * 10 ** 18);
        
        assertEq(token.balanceOf(user1), initialBalance + 100 * 10 ** 18);
    }

    function testGetStakedBalance() public {
        vm.prank(user1);
        verification.stake(1000 * 10 ** 18);
        
        uint256 balance = verification.getStakedBalance(user1);
        assertEq(balance, 1000 * 10 ** 18);
    }
}