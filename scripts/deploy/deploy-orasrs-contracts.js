// deploy-orasrs-contracts.js
import { ethers } from "ethers";

async function deployOraSRSContracts() {
  // 使用Hardhat环境或者直接创建provider
  let provider, wallet;
  
  if (typeof hre !== 'undefined' && hre.ethers) {
    // 如果在Hardhat环境中运行
    [deployer] = await hre.ethers.getSigners();
    provider = deployer.provider;
    wallet = deployer;
  } else {
    // 否则直接连接到RPC
    provider = new ethers.JsonRpcProvider(process.env.CHAINMAKER_RPC_URL || "https://api.orasrs.net");
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      console.error("请设置DEPLOYER_PRIVATE_KEY环境变量");
      process.exit(1);
    }
    wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  }

  console.log("Deploying OraSRS contracts to ChainMaker network...");

  // 部署治理合约
  const GovernanceContract = await ethers.getContractFactory("OraSRSGovernance");
  console.log("Deploying Governance contract...");
  const governance = await GovernanceContract.connect(wallet).deploy();
  await governance.deploymentTransaction().wait();
  console.log("Governance contract deployed at:", await governance.getAddress());

  // 部署威胁证据合约
  const ThreatEvidenceContract = await ethers.getContractFactory("ThreatEvidence");
  console.log("Deploying ThreatEvidence contract...");
  const threatEvidence = await ThreatEvidenceContract.connect(wallet).deploy(await governance.getAddress());
  await threatEvidence.deploymentTransaction().wait();
  console.log("ThreatEvidence contract deployed at:", await threatEvidence.getAddress());

  // 部署威胁情报协调合约
  const ThreatIntelligenceContract = await ethers.getContractFactory("ThreatIntelligenceCoordination");
  console.log("Deploying ThreatIntelligenceCoordination contract...");
  const threatIntelligence = await ThreatIntelligenceContract.connect(wallet).deploy(
    await governance.getAddress(),
    await threatEvidence.getAddress()
  );
  await threatIntelligence.deploymentTransaction().wait();
  console.log("ThreatIntelligenceCoordination contract deployed at:", await threatIntelligence.getAddress());

  // 部署增强威胁验证合约
  const EnhancedVerificationContract = await ethers.getContractFactory("EnhancedThreatVerification");
  console.log("Deploying EnhancedThreatVerification contract...");
  const enhancedVerification = await EnhancedVerificationContract.connect(wallet).deploy(await governance.getAddress());
  await enhancedVerification.deploymentTransaction().wait();
  console.log("EnhancedThreatVerification contract deployed at:", await enhancedVerification.getAddress());

  // 部署隐私保护验证合约
  const PrivacyVerificationContract = await ethers.getContractFactory("PrivacyProtectedVerification");
  console.log("Deploying PrivacyProtectedVerification contract...");
  const privacyVerification = await PrivacyVerificationContract.connect(wallet).deploy(await governance.getAddress());
  await privacyVerification.deploymentTransaction().wait();
  console.log("PrivacyProtectedVerification contract deployed at:", await privacyVerification.getAddress());

  // 部署可验证审计合约
  const AuditTrailContract = await ethers.getContractFactory("VerifiableAuditTrail");
  console.log("Deploying VerifiableAuditTrail contract...");
  const auditTrail = await AuditTrailContract.connect(wallet).deploy(await governance.getAddress());
  await auditTrail.deploymentTransaction().wait();
  console.log("VerifiableAuditTrail contract deployed at:", await auditTrail.getAddress());

  // 保存部署地址
  const fs = await import('fs');
  const addresses = {
    governance: await governance.getAddress(),
    threatEvidence: await threatEvidence.getAddress(),
    threatIntelligence: await threatIntelligence.getAddress(),
    enhancedVerification: await enhancedVerification.getAddress(),
    privacyVerification: await privacyVerification.getAddress(),
    auditTrail: await auditTrail.getAddress(),
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync('deployments.json', JSON.stringify(addresses, null, 2));
  console.log("Contract addresses saved to deployments.json");

  return addresses;
}

// 执行部署
if (import.meta.url === new URL(import.meta.url).href) {
  deployOraSRSContracts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { deployOraSRSContracts };