const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("部署合约的地址: ", deployer.address);
  console.log("账户余额: ", (await deployer.getBalance()).toString());

  // 部署威胁证据合约
  const ThreatEvidence = await ethers.getContractFactory("ThreatEvidence");
  const threatEvidence = await ThreatEvidence.deploy(
    deployer.address // 使用部署者作为治理地址
  );
  await threatEvidence.deployed();
  console.log("ThreatEvidence 合约部署地址:", threatEvidence.address);

  // 部署威胁情报协调合约
  const ThreatIntelligenceCoordination = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  const threatIntelCoord = await ThreatIntelligenceCoordination.deploy(
    deployer.address, // 使用部署者作为治理地址
    threatEvidence.address
  );
  await threatIntelCoord.deployed();
  console.log("ThreatIntelligenceCoordination 合约部署地址:", threatIntelCoord.address);

  // 部署治理合约
  const OraSRSGovernance = await ethers.getContractFactory("OraSRSGovernance");
  const governance = await OraSRSGovernance.deploy(
    deployer.address, // 使用部署者作为Timelock地址
    threatIntelCoord.address
  );
  await governance.deployed();
  console.log("OraSRSGovernance 合约部署地址:", governance.address);

  console.log("所有OraSRS协议合约部署完成！（已移除质押功能，放宽节点注册条件）");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });