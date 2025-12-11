use serde::{Deserialize, Serialize};
use tauri::Manager;
use chrono::{DateTime, Utc};
use std::sync::Mutex;
use std::collections::HashMap;

// 日志自动标记功能
#[tauri::command]
pub async fn annotate_log_entry(
    log_entry: super::LogEntry, 
    state: tauri::State<'_, super::AppState>
) -> Result<super::AnnotatedLogEntry, String> {
    // 检查源IP是否在威胁情报库中
    let threat_intel_cache = state.threat_intel_cache.lock().unwrap();
    let threat_info = threat_intel_cache.get(&log_entry.source_ip);
    
    let (threat_level, threat_type) = if let Some(threat) = threat_info {
        (Some(threat.threat_level), Some(threat.threat_type.clone()))
    } else {
        (None, None)
    };
    
    // 创建带注解的日志条目
    let annotated_entry = super::AnnotatedLogEntry {
        original: log_entry,
        threat_level,
        threat_type,
        annotation_time: Utc::now(),
    };
    
    // 将注解后的日志保存到内存中
    state.log_annotations.lock().unwrap().push(annotated_entry.clone());
    
    Ok(annotated_entry)
}

#[tauri::command]
pub async fn get_annotated_logs(
    state: tauri::State<'_, super::AppState>
) -> Result<Vec<super::AnnotatedLogEntry>, String> {
    let annotations = state.log_annotations.lock().unwrap();
    Ok(annotations.clone())
}

#[tauri::command]
pub async fn get_critical_alerts(
    state: tauri::State<'_, super::AppState>
) -> Result<Vec<super::AnnotatedLogEntry>, String> {
    let annotations = state.log_annotations.lock().unwrap();
    Ok(annotations.iter()
        .filter(|entry| entry.threat_level.unwrap_or(0) >= 4) // 4级以上为Critical
        .cloned()
        .collect())
}

#[tauri::command]
pub async fn process_log_file(
    file_path: String, 
    state: tauri::State<'_, super::AppState>
) -> Result<Vec<super::AnnotatedLogEntry>, String> {
    use std::fs;
    
    // 读取日志文件
    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // 简单的日志解析 - 在实际应用中，这里可能需要更复杂的解析逻辑
    let mut annotated_logs = Vec::new();
    for line in content.lines() {
        // 尝试从日志行中提取IP地址
        // 这里使用简单的正则表达式匹配IP地址
        if let Some(ip) = extract_ip_from_log_line(line) {
            let log_entry = super::LogEntry {
                timestamp: Utc::now(),
                source_ip: ip,
                target_ip: "0.0.0.0".to_string(), // 实际应用中应从日志中提取
                protocol: "TCP".to_string(), // 实际应用中应从日志中提取
                port: 0, // 实际应用中应从日志中提取
                content: line.to_string(),
            };
            
            // 注解日志条目
            let annotated = annotate_log_entry(log_entry, state.clone()).await?;
            annotated_logs.push(annotated);
        }
    }
    
    Ok(annotated_logs)
}

// 从日志行中提取IP地址的简单函数
fn extract_ip_from_log_line(line: &str) -> Option<String> {
    // 这里使用简单的正则表达式来匹配IP地址
    // 在实际应用中，可能需要更复杂的日志解析逻辑
    let ip_regex = regex::Regex::new(r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b").ok()?;
    let caps = ip_regex.captures(line)?;
    
    // 验证IP地址的有效性
    let ip_str = caps.get(0)?.as_str();
    
    // 检查IP地址的每个部分是否在0-255范围内
    let parts: Vec<&str> = ip_str.split('.').collect();
    if parts.len() != 4 {
        return None;
    }
    
    for part in &parts {
        let num = part.parse::<u8>().ok()?;
        if num > 255 {
            return None;
        }
    }
    
    Some(ip_str.to_string())
}