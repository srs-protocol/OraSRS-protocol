use orasrs_agent::{OrasrsAgent, AgentConfig, hybrid_agent::{HybridAgent, AgentConfig as HybridAgentConfig}};
use env_logger;
use ethers::types::Address;
use std::collections::HashMap;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logger
    env_logger::init();
    
    log::info!("Starting OraSRS Hybrid Agent v{}", env!("CARGO_PKG_VERSION"));
    
    // Create hybrid agent configuration for local private chain
    let hybrid_config = HybridAgentConfig {
        domestic_rpc: "http://localhost:8545".to_string(),  // Our local Hardhat node
        overseas_rpc: "http://localhost:8545".to_string(),  // Using same for testing
        domestic_contract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512".parse().unwrap(), // ThreatIntelligenceCoordination contract
        overseas_contract: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512".parse().unwrap(), // Same contract for testing
        layerzero_endpoint: "0x0000000000000000000000000000000000000000".to_string(), // Placeholder
        crypto_mode: orasrs_agent::hybrid_agent::CryptoMode::Auto,
        routing_rules: orasrs_agent::hybrid_agent::RoutingRules {
            domestic_threshold: 50,
            sensitive_keywords: vec!["sensitive".to_string(), "private".to_string(), "internal".to_string()],
            geographic_routing: HashMap::new(),
        },
    };

    // Create and start the hybrid agent
    let agent = HybridAgent::new(hybrid_config)?;
    
    log::info!("OraSRS Hybrid Agent initialized");
    
    // Print initial status
    let status = agent.get_status().await;
    log::info!("Agent status: {:?}", status);
    
    // Simulate threat detection and reporting
    simulate_threat_detection(agent).await;
    
    Ok(())
}

async fn simulate_threat_detection(agent: HybridAgent) {
    log::info!("Starting threat detection simulation...");
    
    // Simulate detection of various threats
    let threats = vec![
        orasrs_agent::hybrid_agent::ThreatIntel {
            threat_id: format!("threat_{}", uuid::Uuid::new_v4()),
            source_ip: "192.168.1.100".to_string(),
            threat_level: 75,
            threat_type: "DDoS".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            evidence_hash: "abc123def456".to_string(),
            geolocation: "Local Network".to_string(),
        },
        orasrs_agent::hybrid_agent::ThreatIntel {
            threat_id: format!("threat_{}", uuid::Uuid::new_v4()),
            source_ip: "104.28.29.30".to_string(),
            threat_level: 90,
            threat_type: "Malware".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            evidence_hash: "def456ghi789".to_string(),
            geolocation: "International".to_string(),
        },
        orasrs_agent::hybrid_agent::ThreatIntel {
            threat_id: format!("threat_{}", uuid::Uuid::new_v4()),
            source_ip: "185.132.189.10".to_string(),
            threat_level: 45,
            threat_type: "Scanning".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            evidence_hash: "ghi789jkl012".to_string(),
            geolocation: "High Risk Region".to_string(),
        },
    ];
    
    for threat in threats {
        log::info!("Detected threat: {} from {} (Level: {})", 
            threat.threat_id, threat.source_ip, threat.threat_level);
        
        // Submit the threat to the appropriate chain
        match agent.submit_threat_intel(threat.clone()).await {
            Ok(()) => log::info!("Successfully submitted threat: {}", threat.threat_id),
            Err(e) => log::error!("Failed to submit threat {}: {}", threat.threat_id, e),
        }
        
        // Sleep briefly between submissions
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    }
    
    log::info!("Threat detection simulation completed");
}