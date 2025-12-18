// src/main.rs
// OraSRS 轻量客户端 - Tauri桌面应用入口

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{Manager, SystemTray, SystemTrayEvent, AppHandle};
use std::sync::Mutex;

// 引入OraSRS核心SDK
use orasrs_core_sdk;

// 全局状态管理
pub struct AppState {
    pub threat_count: Mutex<u32>,
    pub is_monitoring: Mutex<bool>,
    pub last_sync: Mutex<u64>,
    pub connected_nodes: Mutex<u32>, // 新增：连接的节点数
}

fn main() {
    // 系统托盘菜单
    let tray_menu = tauri::menu::MenuBuilder::new()
        .item(&tauri::menu::MenuItem::with_id(
            "show", "显示界面", true, None
        ))
        .item(&tauri::menu::MenuItem::with_id(
            "sync", "同步威胁列表", true, None
        ))
        .separator()
        .item(&tauri::menu::MenuItem::with_id(
            "quit", "退出", true, None
        ))
        .build(&tauri::async_runtime::block_on(tauri::Context::default()).handle())
        .unwrap();

    let system_tray = SystemTray::new()
        .with_menu(tray_menu);

    tauri::Builder::default()
        .manage(AppState {
            threat_count: Mutex::new(0),
            is_monitoring: Mutex::new(true),
            last_sync: Mutex::new(0),
            connected_nodes: Mutex::new(0),
        })
        .setup(|app| {
            // 初始化OraSRS核心SDK
            unsafe {
                // OraSRS协议区块链节点地址
                let rpc_url = std::ffi::CString::new("https://api.orasrs.net").unwrap();
                let contract_addr = std::ffi::CString::new("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512").unwrap(); // 更新为新的NodeRegistry地址
                
                // 初始化SDK
                orasrs_core_sdk::orasrs_init(rpc_url.as_ptr(), contract_addr.as_ptr());
                
                // 立即从区块链获取节点列表
                orasrs_core_sdk::orasrs_update_nodes();
            }
            
            // 隐藏主窗口，通过系统托盘操作
            let main_window = app.get_window("main").unwrap();
            main_window.hide().unwrap();
            
            Ok(())
        })
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| {
            match event {
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "show" => {
                            let window = app.get_window("main").unwrap();
                            if window.is_visible().unwrap() {
                                window.hide().unwrap();
                            } else {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                        }
                        "sync" => {
                            // 触发威胁列表同步
                            sync_threats(app);
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                }
                SystemTrayEvent::LeftClick { .. } => {
                    // 左键单击显示/隐藏窗口
                    let window = app.get_window("main").unwrap();
                    if window.is_visible().unwrap() {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            check_ip,
            sync_threats_cmd,
            get_notifications,
            connect_to_p2p_network,
            get_connected_nodes_count
        ])
        .run(tauri::generate_context!())
        .expect("OraSRS客户端启动失败");
}

// 获取客户端状态
#[tauri::command]
async fn get_status(state: tauri::State<'_, AppState>) -> Result<StatusResponse, String> {
    let threat_count = *state.threat_count.lock().unwrap();
    let is_monitoring = *state.is_monitoring.lock().unwrap();
    let last_sync = *state.last_sync.lock().unwrap();
    
    Ok(StatusResponse {
        threat_count,
        is_monitoring,
        last_sync,
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

// 检查IP是否为威胁
#[tauri::command]
async fn check_ip(ip: String, _state: tauri::State<'_, AppState>) -> Result<bool, String> {
    // 调用核心SDK检查IP
    let c_ip = std::ffi::CString::new(ip).map_err(|e| e.to_string())?;
    let is_threat = unsafe {
        // orasrs_core_sdk::orasrs_check_ip(c_ip.as_ptr())
        true // 模拟返回
    };
    
    if is_threat {
        // 记录威胁事件
        log_threat_event(&format!("IP {} 被识别为威胁", c_ip.to_string_lossy())).await;
    }
    
    Ok(is_threat)
}

// 同步威胁列表
#[tauri::command]
async fn sync_threats_cmd(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let success = unsafe {
        // orasrs_core_sdk::orasrs_update_threats()
        true // 模拟返回
    };
    
    if success {
        let mut threat_count = state.threat_count.lock().unwrap();
        *threat_count += 10; // 模拟新增威胁
        
        let mut last_sync = state.last_sync.lock().unwrap();
        *last_sync = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        log_threat_event("威胁列表同步完成").await;
    }
    
    Ok(())
}

// 获取通知列表
#[tauri::command]
async fn get_notifications(_state: tauri::State<'_, AppState>) -> Result<Vec<Notification>, String> {
    // 在实际实现中，这里会返回从合约事件中获取的通知
    Ok(vec![
        Notification {
            id: 1,
            level: "info".to_string(),
            message: "客户端已启动并开始监听威胁".to_string(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() - 300, // 5分钟前
        }
    ])
}

// 尝试连接到P2P网络中的节点
#[tauri::command]
async fn connect_to_p2p_network(state: tauri::State<'_, AppState>) -> Result<u32, String> {
    let connected_nodes = unsafe {
        orasrs_core_sdk::orasrs_connect_to_all_nodes()
    };
    
    // 更新全局状态
    let mut state_nodes = state.connected_nodes.lock().unwrap();
    *state_nodes = connected_nodes;
    
    Ok(connected_nodes)
}

// 获取连接的节点数
#[tauri::command]
async fn get_connected_nodes_count(state: tauri::State<'_, AppState>) -> Result<u32, String> {
    Ok(*state.connected_nodes.lock().unwrap())
}

// 内部函数：同步威胁列表
fn sync_threats(app: &AppHandle) {
    tauri::async_runtime::spawn(async move {
        let app_clone = app.clone();
        sync_threats_cmd(
            app_clone.state::<AppState>()
        ).await.unwrap();
    });
}

// 内部函数：记录威胁事件
async fn log_threat_event(message: &str) {
    println!("威胁事件: {}", message);
    // 在实际实现中，这里会记录到日志或数据库
}

// 响应结构体定义
#[derive(serde::Serialize)]
struct StatusResponse {
    threat_count: u32,
    is_monitoring: bool,
    last_sync: u64,
    version: String,
}

#[derive(serde::Serialize)]
struct Notification {
    id: u32,
    level: String,
    message: String,
    timestamp: u64,
}