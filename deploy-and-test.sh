#!/bin/bash

echo "开始部署OraSRS合约到ChainMaker网络..."

# 部署合约
node deploy-orasrs-contracts.js

if [ $? -eq 0 ]; then
    echo "合约部署成功！"
    
    echo "开始运行合约测试..."
    npx hardhat test test/orasrs-contract-tests.js
    
    if [ $? -eq 0 ]; then
        echo "所有测试通过！"
        echo "部署详情请查看 deployments.json 文件"
    else
        echo "测试失败，请检查错误信息"
        exit 1
    fi
else
    echo "合约部署失败，请检查错误信息"
    exit 1
fi