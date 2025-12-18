// Prevents additional console window on Windows in release, DO NOT REMOVE!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::fs;
use std::path::Path;

mod nginx_integration;
mod log_annotation;

// 数据结构定义
#[derive(Serialize, Deserialize, Clone)]
struct ThreatIntelEntry {
    id: String,
    ip: String,
    threat_type: String,
    threat_level: u8,  // 1-5, 5为最高
    source: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize)]
struct FirewallRule {
    id: String,
    ip: String,
    rule_type: String,  // "block" or "allow"
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    active: bool,
}

#[derive(Serialize, Deserialize)]
struct LastBlockInfo {
    block_number: u64,
    timestamp: DateTime<Utc>,
    hash: String,
}

#[derive(Serialize, Deserialize)]
struct IncrementalUpdate {
    block_number: u64,
    timestamp: DateTime<Utc>,
    new_threats: Vec<ThreatIntelEntry>,
    removed_threats: Vec<String>, // IP addresses of removed threats
    updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
struct LogEntry {
    timestamp: DateTime<Utc>,
    source_ip: String,
    target_ip: String,
    protocol: String,
    port: u16,
    content: String,
}

#[derive(Serialize, Deserialize)]
struct AnnotatedLogEntry {
    original: LogEntry,
    threat_level: Option<u8>,
    threat_type: Option<String>,
    annotation_time: DateTime<Utc>,
}

// 应用状态管理
#[derive(Default)]
struct AppState {
    threat_intel_cache: Mutex<HashMap<String, ThreatIntelEntry>>,
    firewall_rules: Mutex<Vec<FirewallRule>>,
    last_block: Mutex<LastBlockInfo>,
    incremental_updates: Mutex<Vec<IncrementalUpdate>>,
    silent_mode: Mutex<bool>, // 静默模式状态
    log_annotations: Mutex<Vec<AnnotatedLogEntry>>,
}

// Tauri 命令实现
#[tauri::command]
async fn get_threat_intel(state: tauri::State<'_, AppState>) -> Result<Vec<ThreatIntelEntry>, String> {
    let cache = state.threat_intel_cache.lock().unwrap();
    Ok(cache.values().cloned().collect())
}

#[tauri::command]
async fn add_firewall_rule(ip: String, rule_type: String, duration_hours: u32, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let rule_id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let expires_at = now + chrono::Duration::hours(duration_hours as i64);
    
    let rule = FirewallRule {
        id: rule_id.clone(),
        ip,
        rule_type,
        created_at: now,
        expires_at,
        active: true,
    };
    
    state.firewall_rules.lock().unwrap().push(rule);
    
    // 这里应该调用系统防火墙API，暂时只做模拟
    println!("Added firewall rule: {}", rule_id);
    
    Ok(rule_id)
}

#[tauri::command]
async fn get_firewall_rules(state: tauri::State<'_, AppState>) -> Result<Vec<FirewallRule>, String> {
    let rules = state.firewall_rules.lock().unwrap();
    Ok(rules.clone())
}

#[tauri::command]
async fn sync_with_chain(state: tauri::State<'_, AppState>) -> Result<LastBlockInfo, String> {
    // 模拟与区块链同步
    let last_block = state.last_block.lock().unwrap();
    Ok(last_block.clone())
}

#[tauri::command]
async fn update_last_block(block_number: u64, hash: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut last_block = state.last_block.lock().unwrap();
    last_block.block_number = block_number;
    last_block.timestamp = Utc::now();
    last_block.hash = hash;
    
    // 立即保存到文件
    if let Err(e) = save_last_block_to_file(&*last_block) {
        eprintln!("Failed to save last block to file: {}", e);
    }
    
    Ok(())
}

#[tauri::command]
async fn get_last_block(state: tauri::State<'_, AppState>) -> Result<LastBlockInfo, String> {
    let last_block = state.last_block.lock().unwrap();
    Ok(last_block.clone())
}

#[tauri::command]
async fn set_silent_mode(enabled: bool, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut silent_mode = state.silent_mode.lock().unwrap();
    *silent_mode = enabled;
    Ok(())
}

#[tauri::command]
async fn is_silent_mode(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let silent_mode = state.silent_mode.lock().unwrap();
    Ok(*silent_mode)
}

#[tauri::command]
async fn show_high_risk_alert(ip: String, threat_type: String, app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let silent_mode = state.silent_mode.lock().unwrap();
    
    // 只有在非静默模式下才显示高危警报
    if !*silent_mode {
        // 使用 Tauri 的对话框插件显示通知
        tauri::async_runtime::spawn(async move {
            let _ = tauri_plugin_dialog::DialogBuilder::new()
                .set_title("高危攻击警报")
                .set_message(format!("检测到对 {} 的{}通信，已自动阻断", ip, threat_type))
                .show(|_response| {});
        });
    }
    
    Ok(())
}

#[tauri::command]
async fn check_ip_threat(ip: String, state: tauri::State<'_, AppState>) -> Result<Option<ThreatIntelEntry>, String> {
    let cache = state.threat_intel_cache.lock().unwrap();
    Ok(cache.get(&ip).cloned())
}

#[tauri::command]
async fn add_threat_intel(entry: ThreatIntelEntry, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut cache = state.threat_intel_cache.lock().unwrap();
    cache.insert(entry.ip.clone(), entry);
    Ok(())
}

#[tauri::command]
async fn get_incremental_updates(since_block: Option<u64>, state: tauri::State<'_, AppState>) -> Result<Vec<IncrementalUpdate>, String> {
    let updates = state.incremental_updates.lock().unwrap();
    
    if let Some(since) = since_block {
        Ok(updates.iter()
            .filter(|update| update.block_number > since)
            .cloned()
            .collect())
    } else {
        Ok(updates.iter().cloned().collect())
    }
}

#[tauri::command]
async fn apply_incremental_update(update: IncrementalUpdate, state: tauri::State<'_, AppState>) -> Result<(), String> {
    // 更新威胁情报缓存
    {
        let mut cache = state.threat_intel_cache.lock().unwrap();
        
        // 添加新威胁
        for threat in update.new_threats {
            cache.insert(threat.ip.clone(), threat);
        }
        
        // 移除已过期的威胁
        for ip in update.removed_threats {
            cache.remove(&ip);
        }
    }
    
    // 更新最后区块信息
    {
        let mut last_block = state.last_block.lock().unwrap();
        if update.block_number > last_block.block_number {
            last_block.block_number = update.block_number;
            last_block.timestamp = update.timestamp;
        }
    }
    
    // 保存增量更新记录
    {
        let mut updates = state.incremental_updates.lock().unwrap();
        updates.push(update);
        
        // 限制更新记录数量，只保留最近的100条
        if updates.len() > 100 {
            updates.drain(0..updates.len()-100);
        }
    }
    
    Ok(())
}

use std::fs;
use std::path::Path;

// 从本地文件加载最后区块信息
fn load_last_block_from_file() -> Option<LastBlockInfo> {
    let data_dir = get_data_dir();
    let file_path = data_dir.join("last_block.json");
    
    if !file_path.exists() {
        return None;
    }
    
    match fs::read_to_string(file_path) {
        Ok(content) => {
            match serde_json::from_str(&content) {
                Ok(last_block) => Some(last_block),
                Err(_) => {
                    eprintln!("Failed to parse last_block.json");
                    None
                }
            }
        },
        Err(_) => {
            eprintln!("Failed to read last_block.json");
            None
        }
    }
}

// 保存最后区块信息到本地文件
fn save_last_block_to_file(last_block: &LastBlockInfo) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir)?;
    
    let file_path = data_dir.join("last_block.json");
    let content = serde_json::to_string_pretty(last_block)?;
    fs::write(file_path, content)?;
    
    Ok(())
}

// 获取数据目录路径
fn get_data_dir() -> std::path::PathBuf {
    match dirs::data_dir() {
        Some(mut dir) => {
            dir.push("orasrs-lite-client");
            dir
        },
        None => {
            std::env::current_dir().unwrap_or_else(|_| ".".into()).join("data")
        }
    }
}

// 启动时初始化
fn init_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // 初始化应用状态
    let app_state = AppState::default();
    
    // 从本地文件加载最后区块信息
    let last_block_info = load_last_block_from_file().unwrap_or_else(|| {
        LastBlockInfo {
            block_number: 0,
            timestamp: chrono::Utc::now(),
            hash: "0x0".to_string(),
        }
    });
    
    {
        let mut last_block = app_state.last_block.lock().unwrap();
        *last_block = last_block_info;
    }
    
    app.manage(app_state);
    
    // 启动后台任务
    let handle = app.handle();
    tauri::async_runtime::spawn(async move {
        // 定期清理过期规则
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await; // 每分钟检查一次
            cleanup_expired_rules(handle.clone()).await;
        }
    });
    
    // 启动后台任务：定期保存LastBlock信息到文件
    let handle = app.handle();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(300)).await; // 每5分钟保存一次
            save_last_block_info_to_file(handle.clone()).await;
        }
    });
    
    Ok(())
}

// 保存LastBlock信息到文件的异步函数
async fn save_last_block_info_to_file(handle: tauri::AppHandle) {
    let state: tauri::State<'_, AppState> = handle.state();
    let last_block = state.last_block.lock().unwrap().clone();
    
    if let Err(e) = save_last_block_to_file(&last_block) {
        eprintln!("Failed to save last block to file: {}", e);
    }
}

// 清理过期规则的任务
async fn cleanup_expired_rules(handle: tauri::AppHandle) {
    let state: tauri::State<'_, AppState> = handle.state();
    
    let now = chrono::Utc::now();
    let mut rules = state.firewall_rules.lock().unwrap();
    
    // 标记过期规则为非活动状态并移除
    let mut expired_rule_ids = Vec::new();
    for rule in rules.iter_mut() {
        if rule.expires_at < now && rule.active {
            rule.active = false;
            expired_rule_ids.push(rule.id.clone());
            
            // 这里应该调用系统API移除防火墙规则，暂时只做模拟
            println!("Expired firewall rule removed: {}", rule.id);
        }
    }
    
    // 从内存中移除已过期的规则
    rules.retain(|rule| rule.expires_at > now);
    
    // 移除已经过期的威胁情报
    let mut cache = state.threat_intel_cache.lock().unwrap();
    cache.retain(|_, entry| entry.expires_at > now);
}

fn main() {
    tauri::Builder::default()
        .setup(init_app)
        .invoke_handler(tauri::generate_handler![
            get_threat_intel,
            add_firewall_rule,
            get_firewall_rules,
            sync_with_chain,
            update_last_block,
            check_ip_threat,
            add_threat_intel,
            get_incremental_updates,
            apply_incremental_update,
            get_last_block,
            set_silent_mode,
            is_silent_mode,
            show_high_risk_alert,
            nginx_integration::check_ip_for_nginx,
            nginx_integration::generate_nginx_config_snippet,
            #[cfg(target_os = "linux")]
            nginx_integration::validate_nginx_config,
            #[cfg(target_os = "linux")]
            nginx_integration::reload_nginx,
            log_annotation::annotate_log_entry,
            log_annotation::get_annotated_logs,
            log_annotation::get_critical_alerts,
            log_annotation::process_log_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}