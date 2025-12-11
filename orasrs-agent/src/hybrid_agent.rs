use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
use ethers::prelude::*;
use reqwest;
use anyhow::Result;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatIntel {
    pub threat_id: String,
    pub source_ip: String,
    pub threat_level: u8,
    pub threat_type: String,
    pub timestamp: u64,
    pub evidence_hash: String,
    pub geolocation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub domestic_rpc: String,
    pub overseas_rpc: String,
    pub domestic_contract: Address,
    pub overseas_contract: Address,
    pub layerzero_endpoint: String,
    pub crypto_mode: CryptoMode,
    pub routing_rules: RoutingRules,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CryptoMode {
    Domestic,      // 国内模式：使用国密算法
    Overseas,      // 海外模式：使用国际算法
    Auto,          // 自动模式：根据威胁类型选择
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingRules {
    pub domestic_threshold: u8,  // 国内处理的威胁级别阈值
    pub sensitive_keywords: Vec<String>,  // 敏感关键词，需要本地化处理
    pub geographic_routing: HashMap<String, String>,  // 地理位置路由规则
}

pub struct HybridAgent {
    config: AgentConfig,
    domestic_provider: Arc<dyn JsonRpcClient<Error = impl std::error::Error + Send + Sync>>,
    overseas_provider: Arc<dyn JsonRpcClient<Error = impl std::error::Error + Send + Sync>>,
    domestic_contract: Address,
    overseas_contract: Address,
    crypto_mode: CryptoMode,
    routing_rules: RoutingRules,
    http_client: reqwest::Client,
}

impl HybridAgent {
    pub fn new(config: AgentConfig) -> Result<Self> {
        let http_client = reqwest::Client::new();

        // 创建Provider
        let domestic_provider = Arc::new(
            Provider::<Http>::try_from(&config.domestic_rpc)?
        );
        
        let overseas_provider = Arc::new(
            Provider::<Http>::try_from(&config.overseas_rpc)?
        );

        Ok(HybridAgent {
            domestic_provider,
            overseas_provider,
            domestic_contract: config.domestic_contract,
            overseas_contract: config.overseas_contract,
            crypto_mode: config.crypto_mode.clone(),
            routing_rules: config.routing_rules.clone(),
            http_client,
            config,
        })
    }

    /// 智能路由决策
    pub fn determine_target_chain(&self, threat: &ThreatIntel) -> ChainTarget {
        // 检查是否包含敏感关键词
        for keyword in &self.routing_rules.sensitive_keywords {
            if threat.source_ip.contains(keyword) || threat.geolocation.contains(keyword) {
                return ChainTarget::Domestic;
            }
        }

        // 检查地理位置路由规则
        if let Some(target) = self.routing_rules.geographic_routing.get(&threat.geolocation) {
            if target == "domestic" {
                return ChainTarget::Domestic;
            } else {
                return ChainTarget::Overseas;
            }
        }

        // 根据威胁级别决定
        if threat.threat_level >= self.routing_rules.domestic_threshold {
            ChainTarget::Domestic  // 高威胁等级在本地处理
        } else {
            // 低威胁等级根据其他因素决定
            ChainTarget::Overseas  // 或者根据具体情况决定
        }
    }

    /// 提交威胁情报
    pub async fn submit_threat_intel(&self, threat: ThreatIntel) -> Result<()> {
        let target_chain = self.determine_target_chain(&threat);
        
        match target_chain {
            ChainTarget::Domestic => {
                self.submit_to_domestic(threat).await?;
            }
            ChainTarget::Overseas => {
                self.submit_to_overseas(threat).await?;
            }
        }

        Ok(())
    }

    /// 提交到国内L2网络
    async fn submit_to_domestic(&self, threat: ThreatIntel) -> Result<()> {
        println!("Submitting threat to domestic network: {}", threat.threat_id);
        
        // 根据配置的加密模式处理
        let processed_threat = self.process_crypto(&threat, CryptoMode::Domestic)?;

        // 这里应该调用国内L2合约
        // 简化：实际实现会构造合约调用
        println!("Processed threat with domestic crypto: {:?}", processed_threat);
        
        // 模拟合约交互
        self.simulate_contract_interaction("domestic", &threat).await?;
        
        // 如果需要跨链同步，发送到海外
        if self.should_cross_chain_sync(&threat) {
            self.send_to_overseas(threat).await?;
        }

        Ok(())
    }

    /// 提交到海外L2网络
    async fn submit_to_overseas(&self, threat: ThreatIntel) -> Result<()> {
        println!("Submitting threat to overseas network: {}", threat.threat_id);
        
        // 根据配置的加密模式处理
        let processed_threat = self.process_crypto(&threat, CryptoMode::Overseas)?;

        // 这里应该调用海外L2合约
        // 简化：实际实现会构造合约调用
        println!("Processed threat with overseas crypto: {:?}", processed_threat);
        
        // 模拟合约交互
        self.simulate_contract_interaction("overseas", &threat).await?;
        
        // 如果需要跨链同步，发送到国内
        if self.should_cross_chain_sync(&threat) {
            self.send_to_domestic(threat).await?;
        }

        Ok(())
    }

    /// 发送威胁情报到国内（通过跨链）
    async fn send_to_domestic(&self, threat: ThreatIntel) -> Result<()> {
        println!("Sending threat to domestic via cross-chain: {}", threat.threat_id);
        
        // 调用跨链桥接合约
        // 简化：实际实现会构造LayerZero消息
        println!("Cross-chain message sent to domestic network");
        
        Ok(())
    }

    /// 发送威胁情报到海外（通过跨链）
    async fn send_to_overseas(&self, threat: ThreatIntel) -> Result<()> {
        println!("Sending threat to overseas via cross-chain: {}", threat.threat_id);
        
        // 调用跨链桥接合约
        // 简化：实际实现会构造LayerZero消息
        println!("Cross-chain message sent to overseas network");
        
        Ok(())
    }

    /// 加密处理
    fn process_crypto(&self, threat: &ThreatIntel, mode: CryptoMode) -> Result<ThreatIntel> {
        let mut processed_threat = threat.clone();
        
        match mode {
            CryptoMode::Domestic => {
                // 使用国密算法处理
                println!("Processing with domestic crypto (SM2/SM3/SM4): {}", threat.threat_id);
                // 实际实现会使用国密算法进行加密/签名
                processed_threat.evidence_hash = format!("sm3_{}", threat.evidence_hash);
            }
            CryptoMode::Overseas => {
                // 使用国际算法处理
                println!("Processing with overseas crypto (ECDSA/Keccak): {}", threat.threat_id);
                // 实际实现会使用国际算法进行加密/签名
                processed_threat.evidence_hash = format!("keccak_{}", threat.evidence_hash);
            }
            CryptoMode::Auto => {
                // 根据威胁类型自动选择
                if self.is_sensitive_threat(threat) {
                    println!("Processing sensitive threat with domestic crypto: {}", threat.threat_id);
                    processed_threat.evidence_hash = format!("sm3_{}", threat.evidence_hash);
                } else {
                    println!("Processing general threat with overseas crypto: {}", threat.threat_id);
                    processed_threat.evidence_hash = format!("keccak_{}", threat.evidence_hash);
                }
            }
        }
        
        Ok(processed_threat)
    }

    /// 判断是否为敏感威胁
    fn is_sensitive_threat(&self, threat: &ThreatIntel) -> bool {
        threat.threat_level >= 80 || 
        self.routing_rules.sensitive_keywords.iter().any(|keyword| 
            threat.source_ip.contains(keyword) || threat.geolocation.contains(keyword)
        )
    }

    /// 判断是否需要跨链同步
    fn should_cross_chain_sync(&self, threat: &ThreatIntel) -> bool {
        // 高威胁等级且非敏感信息，可以跨链同步
        threat.threat_level >= 70 && !self.is_sensitive_threat(threat)
    }

    /// 模拟合约交互
    async fn simulate_contract_interaction(&self, network: &str, threat: &ThreatIntel) -> Result<()> {
        println!("Simulating contract interaction on {} network for threat: {}", network, threat.threat_id);
        
        // 在实际实现中，这里会构造并发送交易到相应的合约
        // 例如：调用ThreatIntelSync合约的sendThreatIntel函数
        
        Ok(())
    }

    /// 切换加密模式
    pub fn switch_crypto_mode(&mut self, new_mode: CryptoMode) {
        self.crypto_mode = new_mode;
        println!("Crypto mode switched");
    }

    /// 切换路由规则
    pub fn update_routing_rules(&mut self, new_rules: RoutingRules) {
        self.routing_rules = new_rules;
        println!("Routing rules updated");
    }

    /// 获取当前状态
    pub async fn get_status(&self) -> AgentStatus {
        AgentStatus {
            active: true,
            crypto_mode: self.crypto_mode.clone(),
            domestic_endpoint: self.config.domestic_rpc.clone(),
            overseas_endpoint: self.config.overseas_rpc.clone(),
            last_processed: chrono::Utc::now().timestamp() as u64,
        }
    }
}

#[derive(Debug, Clone)]
pub enum ChainTarget {
    Domestic,
    Overseas,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub active: bool,
    pub crypto_mode: CryptoMode,
    pub domestic_endpoint: String,
    pub overseas_endpoint: String,
    pub last_processed: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_threat_routing() {
        let config = AgentConfig {
            domestic_rpc: "https://api.orasrs.net".to_string(),
            overseas_rpc: "https://sepolia.optimism.io".to_string(),
            domestic_contract: Address::zero(),
            overseas_contract: Address::zero(),
            layerzero_endpoint: "0x...".to_string(),
            crypto_mode: CryptoMode::Auto,
            routing_rules: RoutingRules {
                domestic_threshold: 70,
                sensitive_keywords: vec!["sensitive".to_string(), "private".to_string()],
                geographic_routing: HashMap::new(),
            },
        };

        let agent = HybridAgent::new(config).unwrap();
        
        // 测试高威胁等级路由到国内
        let high_threat = ThreatIntel {
            threat_id: "test_high_001".to_string(),
            source_ip: "192.168.1.1".to_string(),
            threat_level: 85,
            threat_type: "DDoS".to_string(),
            timestamp: 1234567890,
            evidence_hash: "abc123".to_string(),
            geolocation: "Beijing".to_string(),
        };

        assert_eq!(agent.determine_target_chain(&high_threat), ChainTarget::Domestic);
        
        // 测试低威胁等级路由到海外
        let low_threat = ThreatIntel {
            threat_id: "test_low_001".to_string(),
            source_ip: "8.8.8.8".to_string(),
            threat_level: 30,
            threat_type: "Scanning".to_string(),
            timestamp: 1234567890,
            evidence_hash: "def456".to_string(),
            geolocation: "International".to_string(),
        };

        assert_eq!(agent.determine_target_chain(&low_threat), ChainTarget::Overseas);
    }
}