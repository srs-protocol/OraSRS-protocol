// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/OraSRSToken.sol";
import "../contracts/EnhancedThreatVerification.sol";

contract OraSRSTokenTest is Test {
    OraSRSToken public token;
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);

    function setUp() public {
        vm.prank(owner);
        token = new OraSRSToken();
    }

    function testInitialSupply() public {
        assertEq(token.totalSupply(), 100_000_000 * 10 ** 18);
        assertEq(token.balanceOf(owner), 100_000_000 * 10 ** 18);
    }

    function testMint() public {
        vm.prank(owner);
        token.mint(user1, 1000 * 10 ** 18);
        
        assertEq(token.balanceOf(user1), 1000 * 10 ** 18);
        assertEq(token.totalSupply(), 100_000_000 * 10 ** 18 + 1000 * 10 ** 18);
    }

    function testMintOnlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user1, 1000 * 10 ** 18);
    }

    function testTransfer() public {
        vm.prank(owner);
        token.mint(user1, 1000 * 10 ** 18);
        
        vm.prank(user1);
        token.transfer(user2, 500 * 10 ** 18);
        
        assertEq(token.balanceOf(user1), 500 * 10 ** 18);
        assertEq(token.balanceOf(user2), 500 * 10 ** 18);
    }

    function testBurn() public {
        vm.prank(owner);
        token.mint(user1, 1000 * 10 ** 18);
        
        vm.prank(user1);
        token.burn(500 * 10 ** 18);
        
        assertEq(token.balanceOf(user1), 500 * 10 ** 18);
        assertEq(token.totalSupply(), 100_000_000 * 10 ** 18 + 500 * 10 ** 18);
    }
}