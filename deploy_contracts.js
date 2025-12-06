const { ethers } = require("ethers");

async function deploy() {
    console.log("开始部署OraSRS跨链合约...");
    
    // 使用Hardhat网络或本地节点
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    
    // 获取默认账户
    const [deployer] = await provider.listAccounts();
    const deployerSigner = new ethers.Wallet(process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
    
    console.log("部署者地址:", deployer);
    
    // 首先部署Mock LayerZero Endpoint
    const MockLzEndpoint = new ethers.ContractFactory(
        [
            "function setChainAddress(uint16,address)",
            "function send(uint16,bytes,bytes,address,address,bytes) payable",
            "function estimateFees(uint16,address,bytes,bool,bytes) view returns (uint256,uint256)",
            "function getMessageCount() view returns (uint256)"
        ],
        // MockLayerZeroEndpoint的字节码 (简化版本)
        "608060405234801561001057600080fd5b50600436106100365760003560e01c806312aa4c2f1461003b57806313e2387e1461005957600080fd5b600080fd5b610043610075565b604051610050919061026d565b60405180910390f35b610073600480360381019061006e91906101c3565b61008e565b005b60008054905090565b8060008190555050565b600081359050610097816102c5565b92915050565b6000602082840312156100b2576100b16102bc565b5b60006100c084828501610088565b91505092915050565b600080604083850312156100df576100de6102bc565b5b60006100ed85828601610088565b92505060206100fe85828601610088565b9150509250929050565b6000806000606084860312156101205761011f6102bc565b5b600061012e86828701610088565b935050602061013f86828701610088565b925050604061015086828701610088565b9150509250925092565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6101b781610178565b81146101c257600080fd5b50565b6000813590506101d5816102db565b92915050565b6000819050919050565b6101ee816101dd565b81146101f957600080fd5b50565b60008135905061020c816102db565b92915050565b600082601f830112610226576102256102b7565b5b81356102386102a1565b905080825260208301858383011115610254576102536102c0565b5b60005b8381101561027657818101518382015260200161025c565b83811115610285576000848401600052826000526040600020600090555b50505050905090810190601f1680156102a15780820380516001836020026000191614156102a157600080fd5b505050565b6040519050601f196036600a8301511681019081106102c6576102c5610193565b5b9050919050565b600082905092915050565b60006102e3826101dd565b6102ed81876101e7565b95945050505050565b600081905091905056fea2646970667358221220f2d507551d5c54e6082b034d815187a6b6a7561e2e4932a1d538661e6667466f64736f6c63430008110033",
        deployerSigner
    );
    
    console.log("部署Mock LayerZero Endpoint...");
    const lzEndpoint = await MockLzEndpoint.deploy();
    await lzEndpoint.deployed();
    console.log("Mock LayerZero Endpoint 部署成功:", lzEndpoint.address);
    
    // 部署威胁情报同步合约
    const ThreatIntelSync = await ethers.getContractFactory("ThreatIntelSync");
    console.log("部署ThreatIntelSync合约...");
    const threatIntelSync = await ThreatIntelSync.deploy(
        lzEndpoint.address,           // LayerZero端点
        deployer,                     // 治理合约地址
        1001,                        // 国内链ID
        1002                         // 海外界链ID
    );
    await threatIntelSync.deployed();
    console.log("ThreatIntelSync部署成功:", threatIntelSync.address);
    
    // 部署治理镜像合约
    const GovernanceMirror = await ethers.getContractFactory("GovernanceMirror");
    console.log("部署GovernanceMirror合约...");
    const governanceMirror = await GovernanceMirror.deploy(
        lzEndpoint.address,           // LayerZero端点
        deployer,                     // 治理合约地址
        threatIntelSync.address,      // 威胁情报同步合约地址
        1001,                        // 国内链ID
        1002                         // 海外界链ID
    );
    await governanceMirror.deployed();
    console.log("GovernanceMirror部署成功:", governanceMirror.address);
    
    // 配置链地址映射
    console.log("配置链地址映射...");
    await lzEndpoint.setChainAddress(1001, threatIntelSync.address);
    await lzEndpoint.setChainAddress(1002, threatIntelSync.address);
    
    // 保存部署地址
    const fs = require('fs');
    const addresses = {
        mockLayerZeroEndpoint: lzEndpoint.address,
        threatIntelSync: threatIntelSync.address,
        governanceMirror: governanceMirror.address,
        deployer: deployer,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('deployed_addresses/addresses.json', JSON.stringify(addresses, null, 2));
    console.log("部署地址已保存到 deployed_addresses/addresses.json");
    
    console.log("合约部署完成！");
    console.log("部署的合约地址:");
    console.log("- Mock LayerZero Endpoint:", lzEndpoint.address);
    console.log("- ThreatIntelSync:", threatIntelSync.address);
    console.log("- GovernanceMirror:", governanceMirror.address);
}

// 运行部署
deploy().catch((error) => {
    console.error(error);
    process.exit(1);
});
