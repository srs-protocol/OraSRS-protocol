// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/orasrs-staking-gm.sol";

contract OrasrsStakingGmSecurityTest is Test {
    OrasrsStakingGmContract public stakingContract;
    address public governance;
    address public node1;
    address public attacker;
    address public validator;

    function setUp() public {
        governance = address(1);
        node1 = address(2);
        attacker = address(4);
        validator = address(5);
        
        stakingContract = new OrasrsStakingGmContract(governance);
        
        // 授权验证器
        vm.prank(governance);
        stakingContract.addValidator(validator);
    }

    // 测试：合约初始化
    function testContractInitialization() public {
        assertEq(stakingContract.owner(), governance);
        assertEq(uint256(stakingContract.contractState()), uint256(OrasrsStakingGmContract.ContractState.Active));
    }

    // 测试：权限控制
    function testAccessControl() public {
        // 非治理地址尝试暂停合约 - 应该失败
        vm.expectRevert();
        stakingContract.pauseContract();
        
        // 治理地址暂停合约 - 应该成功
        vm.prank(governance);
        stakingContract.pauseContract();
        
        // 验证合约状态
        assertEq(uint256(stakingContract.contractState()), uint256(OrasrsStakingGmContract.ContractState.Paused));
        
        // 恢复合约
        vm.prank(governance);
        stakingContract.resumeContract();
    }

    // 测试：质押金额验证（简化版）
    function testStakeAmountValidation() public {
        vm.deal(node1, 5000 ether);
        
        vm.prank(node1);
        vm.expectRevert(); // 低于最小质押金额应该失败
        stakingContract.stakeWithGmSign(
            "test-node-low",
            5000 ether, // 小于MIN_STAKE_ROOT (10000)
            hex"",
            bytes32(0),
            1,
            "license_hash_1",
            "filing_hash_1",
            0 // 根层节点
        );
    }
}

// 简化的攻击合约
contract ReentrancyAttacker {
    OrasrsStakingGmContract public target;
    
    constructor(address payable _target) {
        target = OrasrsStakingGmContract(_target);
    }
    
    function attack() public payable {
        // 尝试进行重入攻击
    }
    
    receive() external payable {
        // 重入点
    }
}