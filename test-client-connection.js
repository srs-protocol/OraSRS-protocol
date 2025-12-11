#!/usr/bin/env node

/**
 * OraSRS 客户端连接测试脚本
 * 用于测试本地和OraSRS协议链连接
 */

import axios from 'axios';

// 测试配置
const testConfig = {
  // 本地节点配置
  local: {
    url: 'http://localhost:8545',
    name: 'Local Node (8545)'
  },
  // 公网节点配置
  public: {
    url: 'https://api.orasrs.net',
    name: 'Public API (api.orasrs.net)'
  },
  // 备用公网节点
  backup: {
    url: 'https://backup.orasrs.net',
    name: 'Backup API (backup.orasrs.net)'
  }
};

// 测试连接函数
async function testConnection(name, url) {
  console.log(`\n🧪 开始测试 ${name}: ${url}`);
  
  try {
    // 测试基础连接
    const healthResponse = await axios.get(`${url}/health`, {
      timeout: 10000
    });
    
    console.log(`✅ ${name} 健康检查成功`);
    console.log(`📊 响应数据:`, healthResponse.data);
    
    // 测试风险查询
    const queryResponse = await axios.get(`${url}/orasrs/v1/query?ip=8.8.8.8`, {
      timeout: 10000
    });
    
    console.log(`✅ ${name} 风险查询成功`);
    console.log(`📊 查询结果:`, queryResponse.data);
    
    return { success: true, data: queryResponse.data };
    
  } catch (error) {
    console.log(`❌ ${name} 连接失败:`, error.message);
    
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`);
      console.log(`   响应数据:`, error.response.data);
    }
    
    return { success: false, error: error.message };
  }
}

// 测试区块链连接
async function testBlockchainConnection(name, url) {
  console.log(`\n🔗 测试 ${name} 区块链连接...`);
  
  try {
    // 模拟区块链连接测试
    const response = await axios.post(`${url}`, {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.result) {
      console.log(`✅ ${name} 区块链连接成功`);
      console.log(`📋 当前区块高度: ${response.data.result}`);
      return { success: true, blockNumber: response.data.result };
    } else {
      console.log(`❌ ${name} 区块链连接失败，无有效响应`);
      return { success: false };
    }
    
  } catch (error) {
    console.log(`❌ ${name} 区块链连接失败:`, error.message);
    return { success: false, error: error.message };
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始 OraSRS 客户端连接测试...\n');
  
  // 测试本地节点
  const localResult = await testConnection(testConfig.local.name, testConfig.local.url);
  
  // 测试公网节点
  const publicResult = await testConnection(testConfig.public.name, testConfig.public.url);
  
  // 如果公网节点失败，测试备用节点
  if (!publicResult.success) {
    console.log('\n⚠️  OraSRS协议链节点连接失败，尝试备用节点...');
    const backupResult = await testConnection(testConfig.backup.name, testConfig.backup.url);
  }
  
  // 测试本地区块链连接
  const localBlockchainResult = await testBlockchainConnection(testConfig.local.name, testConfig.local.url);
  
  // 测试结果汇总
  console.log('\n📋 测试结果汇总:');
  console.log(`本地节点: ${localResult.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`公网节点: ${publicResult.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`本地区块链: ${localBlockchainResult.success ? '✅ 通过' : '❌ 失败'}`);
  
  // 如果本地节点成功但公网节点失败，提供配置建议
  if (localResult.success && !publicResult.success) {
    console.log('\n💡 建议配置:');
    console.log('1. 检查网络连接和防火墙设置');
    console.log('2. 验证公网RPC端点是否可用');
    console.log('3. 考虑使用本地节点作为主要连接');
    console.log('4. 更新客户端配置以使用本地节点');
  }
  
  console.log('\n✅ 测试完成!');
}

// 运行测试
runTests().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});