#[cfg(target_os = "linux")]
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::sync::Mutex;

#[derive(Serialize, Deserialize)]
struct NginxConfig {
    enabled: bool,
    config_path: String,
    port: u16,
}

#[derive(Serialize, Deserialize)]
struct ThreatCheckResult {
    blocked: bool,
    reason: String,
    threat_level: u8,
}

// 检查IP是否在威胁列表中，并返回威胁检查结果
#[tauri::command]
async fn check_ip_for_nginx(ip: String, state: tauri::State<'_, super::AppState>) -> Result<ThreatCheckResult, String> {
    let cache = state.threat_intel_cache.lock().unwrap();
    
    if let Some(threat) = cache.get(&ip) {
        if threat.threat_level >= 3 {  // 如果威胁级别大于等于3，则阻止
            return Ok(ThreatCheckResult {
                blocked: true,
                reason: threat.threat_type.clone(),
                threat_level: threat.threat_level,
            });
        }
    }
    
    Ok(ThreatCheckResult {
        blocked: false,
        reason: "No threat detected".to_string(),
        threat_level: 0,
    })
}

// 验证Nginx配置
#[tauri::command]
#[cfg(target_os = "linux")]
async fn validate_nginx_config(config_path: String) -> Result<bool, String> {
    let output = Command::new("nginx")
        .arg("-t")
        .arg("-c")
        .arg(config_path)
        .output()
        .map_err(|e| format!("Failed to execute nginx: {}", e))?;

    Ok(output.status.success())
}

// 重新加载Nginx配置
#[tauri::command]
#[cfg(target_os = "linux")]
async fn reload_nginx() -> Result<(), String> {
    let output = Command::new("nginx")
        .arg("-s")
        .arg("reload")
        .output()
        .map_err(|e| format!("Failed to reload nginx: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Nginx reload failed: {}", stderr))
    }
}

// 生成Nginx配置片段
#[tauri::command]
async fn generate_nginx_config_snippet(state: tauri::State<'_, super::AppState>) -> Result<String, String> {
    let cache = state.threat_intel_cache.lock().unwrap();
    
    let mut config = String::from("# Auto-generated OraSRS threat intelligence block list\n");
    config.push_str("# This file is automatically updated by OraSRS Lite Client\n\n");
    
    // 添加所有高威胁IP到block列表
    for (ip, threat) in cache.iter() {
        if threat.threat_level >= 3 {  // 只添加高威胁IP
            config.push_str(&format!("deny {};/t# {} threat: {}\n", ip, threat.threat_level, threat.threat_type));
        }
    }
    
    config.push_str("\n# End of OraSRS threat intelligence block list\n");
    
    Ok(config)
}
