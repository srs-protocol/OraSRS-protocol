#!/bin/bash
echo "编译OraSRS智能合约..."

# 创建一个简单的合约编译脚本
if [ -f "../chainmaker-contract/main/orasrs" ]; then
    echo "复制预编译的ChainMaker合约..."
    cp ../chainmaker-contract/main/orasrs contracts/
elif [ -f "../chainmaker-contract/main/main" ]; then
    echo "复制预编译的ChainMaker合约..."
    cp ../chainmaker-contract/main/main contracts/orasrs
else
    echo "警告: 未找到预编译合约，创建模拟合约..."
    echo '#!/bin/bash' > contracts/orasrs
    echo 'echo "Mock OraSRS Contract"' >> contracts/orasrs
    chmod +x contracts/orasrs
fi
