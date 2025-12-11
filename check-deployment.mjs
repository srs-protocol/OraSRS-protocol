// 检查部署信息
import fs from 'fs';

const deploymentInfo = JSON.parse(fs.readFileSync('all-deployments.json', 'utf8'));
console.log("部署信息:", deploymentInfo);

// 验证GasSubsidy合约地址是否存在
if (deploymentInfo.gasSubsidyAddress) {
  console.log("✓ GasSubsidy合约地址存在:", deploymentInfo.gasSubsidyAddress);
} else {
  console.log("✗ GasSubsidy合约地址不存在");
}