// scripts/agent-registration.js
const { ethers } = require("hardhat");

async function main() {
  console.log("OraSRS Agent注册和初始化脚本");
  
  try {
    // 获取部署者账户（作为治理账户）
    const [deployer] = await ethers.getSigners();
    console.log("治理账户:", deployer.address);

    // 连接到已部署的OraPoints合约
    const oraPointsAddress = process.env.ORAPTS_CONTRACT_ADDRESS;
    if (!oraPointsAddress) {
      console.error("请设置ORAPTS_CONTRACT_ADDRESS环境变量");
      process.exit(1);
    }
    
    const OraPoints = await ethers.getContractFactory("OraPoints");
    const oraPoints = new ethers.Contract(oraPointsAddress, OraPoints.interface, deployer);
    
    console.log("连接到OraPoints合约:", oraPointsAddress);
    
    // 示例：为一些预定义的节点地址添加初始积分
    const sampleNodes = [
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293Bc",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
    ];
    
    console.log("\n为示例节点分配初始积分...");
    for (const nodeAddr of sampleNodes) {
      try {
        const tx = await oraPoints.batchDistribute([nodeAddr], [ethers.utils.parseEther("100")]);
        await tx.wait();
        console.log(`✓ 为节点 ${nodeAddr} 分配了100积分`);
      } catch (error) {
        console.log(`⚠️  为节点 ${nodeAddr} 分配积分时出错:`, error.message);
      }
    }
    
    // 显示积分系统状态
    console.log("\n积分系统状态:");
    for (const nodeAddr of sampleNodes) {
      try {
        const balance = await oraPoints.getBalance(nodeAddr);
        console.log(`${nodeAddr}: ${ethers.utils.formatEther(balance)} 积分`);
      } catch (error) {
        console.log(`${nodeAddr}: 查询失败 - ${error.message}`);
      }
    }
    
    console.log("\nAgent注册流程说明:");
    console.log("1. Agent启动时生成公私钥对");
    console.log("2. 向OraPoints合约调用registerAndClaim()获取初始积分");
    console.log("3. 使用积分提交威胁情报数据");
    console.log("4. 通过验证获得积分奖励，提交虚假数据扣除积分");
    
  } catch (error) {
    console.error("脚本执行出错:", error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\nAgent注册脚本执行完成！");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n脚本执行失败:", error);
    process.exit(1);
  });