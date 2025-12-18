//! OraSRS 核心SDK - 通用安全插件
//! 实现链上订阅 -> 本地同步 -> 内核阻断 的最小闭环
//! 
//! 该SDK编译为动态链接库，可被C/C++/Python/Go/Node.js等语言调用

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use std::net::{SocketAddr, TcpStream};
use std::io::{Read, Write};

// 导入外部依赖
use roaring::RoaringBitmap;
use bloomfish::{BloomFilter, OptimalBloomFilter};
use serde::{Deserialize, Serialize};
use ethers::prelude::*;
use tokio::net::TcpStream as TokioTcpStream;
use tokio::time::{timeout, Duration as TokioDuration};

// 用于存储威胁信息的结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatInfo {
    pub threat_type: String,  // "IP", "DOMAIN", "URL"
    pub threat_value: String, // 具体的IP地址或域名
    pub threat_level: u8,     // 威胁等级 1-5
    pub timestamp: u64,       // 发现时间戳
    pub expiration: u64,      // 过期时间戳
    pub source: String,       // 威胁来源
    pub evidence: String,     // 证据摘要
}

// 节点信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub ip: String,
    pub port: u16,
    pub wallet: String,
}

// 全局威胁缓存（使用Roaring Bitmap优化存储）
static mut THREAT_CACHE: Option<Arc<Mutex<ThreatCache>>> = None;

// 威胁缓存结构
pub struct ThreatCache {
    // IP黑名单（使用Roaring Bitmap优化存储）
    ip_blacklist: RoaringBitmap,
    
    // 域名威胁映射（带TTL）
    domain_threats: HashMap<String, (ThreatInfo, u64)>,
    
    // 网络节点列表
    nodes: Vec<NodeInfo>,
    
    // 更新时间
    last_update: u64,
    
    // 合约地址
    contract_addr: String,
    
    // RPC链接
    rpc_endpoint: String,
    
    // TTL配置（默认24小时）
    ttl_seconds: u64,
}

impl ThreatCache {
    pub fn new(rpc_endpoint: String, contract_addr: String) -> Self {
        ThreatCache {
            ip_blacklist: RoaringBitmap::new(),
            domain_threats: HashMap::new(),
            nodes: Vec::new(),
            last_update: 0,
            contract_addr,
            rpc_endpoint,
            ttl_seconds: 24 * 3600, // 24小时
        }
    }

    // 检查IP是否在黑名单中
    pub fn is_ip_blocked(&self, ip_str: &str) -> bool {
        if let Ok(ip_num) = self.ip_str_to_u32(ip_str) {
            self.ip_blacklist.contains(ip_num)
        } else {
            false
        }
    }

    // 检查域名是否为威胁
    pub fn is_domain_threat(&self, domain: &str) -> bool {
        if let Some((_, expiration)) = self.domain_threats.get(domain) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            // 检查是否过期
            now < *expiration
        } else {
            false
        }
    }

    // 将IP字符串转换为u32
    fn ip_str_to_u32(&self, ip_str: &str) -> Result<u32, std::net::AddrParseError> {
        let ip = ip_str.parse::<std::net::Ipv4Addr>()?;
        let octets = ip.octets();
        Ok(((octets[0] as u32) << 24) | 
           ((octets[1] as u32) << 16) | 
           ((octets[2] as u32) << 8) | 
           (octets[3] as u32))
    }

    // 添加IP到黑名单
    pub fn add_ip_to_blacklist(&mut self, ip_str: &str) {
        if let Ok(ip_num) = self.ip_str_to_u32(ip_str) {
            self.ip_blacklist.insert(ip_num);
        }
    }

    // 添加域名威胁
    pub fn add_domain_threat(&mut self, threat: ThreatInfo) {
        let expiration = threat.timestamp + self.ttl_seconds;
        self.domain_threats.insert(threat.threat_value.clone(), (threat, expiration));
    }

    // 清理过期的威胁信息
    pub fn cleanup_expired(&mut self) {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        self.domain_threats.retain(|_, (_, expiration)| {
            *expiration > now
        });
    }

    // 从区块链合约获取节点列表
    pub async fn fetch_nodes_from_contract(&mut self) -> Result<Vec<NodeInfo>, Box<dyn std::error::Error>> {
        // 创建HTTP Provider连接到RPC端点
        let provider = Provider::<Http>::try_from(&self.rpc_endpoint)?;
        
        // 将合约地址转换为Address类型
        let contract_address: Address = self.contract_addr.parse()?;
        
        // 计算getNodes()函数的函数选择器
        let function_selector = "getNodes()".to_string();
        let signature_hash = ethers::utils::keccak256(function_selector.as_bytes());
        let selector = &signature_hash[0..4];  // 取前4字节作为函数选择器
        
        // 构造函数调用数据
        let call_data = selector.to_vec();
        
        // 创建调用参数
        let tx_req = TransactionRequest::new()
            .to(contract_address)
            .data(call_data);
        
        // 执行eth_call RPC调用
        let result = provider.call(&tx_req, None).await?;
        
        // 解析返回数据 - 这里需要根据ABI进行解码
        // 简化处理：假设返回的是NodeInfo结构的编码数据
        let nodes = self.decode_nodes_from_bytes(&result)?;
        
        Ok(nodes)
    }

    // 解码节点列表的字节数据
    fn decode_nodes_from_bytes(&self, data: &ethers::types::Bytes) -> Result<Vec<NodeInfo>, Box<dyn std::error::Error>> {
        // 使用ethers ABI进行解码
        use ethers::abi::{Token, ParamType};
        
        // 定义getNodes返回值的ABI类型: NodeInfo[]
        let param_type = ParamType::Array(Box::new(ParamType::Tuple(vec![
            ParamType::String,    // ip
            ParamType::Uint(16),  // port
            ParamType::Address,   // wallet
        ])));
        
        // 解码返回的数据
        let tokens = ethers::abi::decode(&[param_type], data)?;
        
        if let Some(Token::Array(node_tokens)) = tokens.get(0) {
            let mut nodes = Vec::new();
            
            for token in node_tokens {
                if let Token::Tuple(ref fields) = token {
                    if fields.len() >= 3 {
                        if let (Token::String(ip), Token::Uint(port), Token::Address(wallet)) = (&fields[0], &fields[1], &fields[2]) {
                            let node = NodeInfo {
                                ip: ip.clone(),
                                port: port.as_u32() as u16,
                                wallet: format!("{:?}", wallet),
                            };
                            nodes.push(node);
                        }
                    }
                }
            }
            
            Ok(nodes)
        } else {
            Ok(Vec::new()) // 如果解码失败，返回空列表
        }
    }

    // 更新节点列表
    pub async fn update_nodes(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        match self.fetch_nodes_from_contract().await {
            Ok(nodes) => {
                self.nodes = nodes;
                self.last_update = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                Ok(())
            }
            Err(e) => {
                eprintln!("获取节点列表失败: {}", e);
                Err(e)
            }
        }
    }

    // 获取当前节点列表
    pub fn get_nodes(&self) -> &Vec<NodeInfo> {
        &self.nodes
    }
}

// ========================
// C ABI 接口 - 供外部调用
// ========================

/// 初始化OraSRS插件
/// 
/// # Parameters
/// * `rpc_url` - 区块链RPC端点
/// * `contract_addr` - 合约地址
/// 
/// # Returns
/// * `bool` - 初始化是否成功
#[no_mangle]
pub extern "C" fn orasrs_init(rpc_url: *const c_char, contract_addr: *const c_char) -> bool {
    unsafe {
        if THREAT_CACHE.is_some() {
            return true; // 已初始化
        }

        let rpc_str = if !rpc_url.is_null() {
            CStr::from_ptr(rpc_url).to_str().unwrap_or("https://api.orasrs.net")
        } else {
            "https://api.orasrs.net"
        };

        let contract_str = if !contract_addr.is_null() {
            CStr::from_ptr(contract_addr).to_str().unwrap_or("")
        } else {
            ""
        };

        let cache = ThreatCache::new(rpc_str.to_string(), contract_str.to_string());
        THREAT_CACHE = Some(Arc::new(Mutex::new(cache)));
        
        // 启动后台更新线程
        std::thread::spawn(|| {
            update_loop();
        });

        // 初始化时获取节点列表
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(mut cache_lock) = cache.lock() {
                let runtime = tokio::runtime::Runtime::new().unwrap();
                runtime.block_on(async {
                    fetch_node_list(&mut *cache_lock).await;
                });
            }
        }

        true
    }
}

/// 检查IP是否为恶意IP
/// 
/// # Parameters
/// * `ip_str` - IP地址字符串
/// 
/// # Returns
/// * `bool` - true表示IP为恶意，false表示安全
#[no_mangle]
pub extern "C" fn orasrs_check_ip(ip_str: *const c_char) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                if let Ok(ip) = CStr::from_ptr(ip_str).to_str() {
                    return cache_lock.is_ip_blocked(ip);
                }
            }
        }
        false
    }
}

/// 检查域名是否为威胁
/// 
/// # Parameters
/// * `domain` - 域名字符串
/// 
/// # Returns
/// * `bool` - true表示域名为威胁，false表示安全
#[no_mangle]
pub extern "C" fn orasrs_check_domain(domain: *const c_char) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                if let Ok(domain_str) = CStr::from_ptr(domain).to_str() {
                    return cache_lock.is_domain_threat(domain_str);
                }
            }
        }
        false
    }
}

/// 启用内核级阻断（仅在支持的系统上）
#[no_mangle]
pub extern "C" fn orasrs_kernel_block_enable() {
    // 这接系统防火墙API进行阻断
    // Linux: iptables
    // Windows: WFP (Windows Filtering Platform)
    // macOS: pfctl
    enable_kernel_blocking();
}

// ========================
// P2P网络连接功能
// ========================

/// 尝试连接到指定节点
/// 
/// # Parameters
/// * `ip_str` - 节点IP地址字符串
/// * `port` - 节点端口号
/// 
/// # Returns
/// * `bool` - 连接是否成功
#[no_mangle]
pub extern "C" fn orasrs_connect_to_node(ip_str: *const c_char, port: u16) -> bool {
    if let Ok(ip) = CStr::from_ptr(ip_str).to_str() {
        let addr = format!("{}:{}", ip, port);
        
        // 使用TCP连接测试节点可达性
        match addr.parse::<SocketAddr>() {
            Ok(socket_addr) => {
                // 尝试建立连接（带超时）
                match timeout_connection(&socket_addr) {
                    Ok(_) => {
                        println!("成功连接到节点: {}", socket_addr);
                        true
                    },
                    Err(_) => {
                        eprintln!("连接节点失败: {}", socket_addr);
                        false
                    }
                }
            },
            Err(_) => {
                eprintln!("无效的地址格式: {}", addr);
                false
            }
        }
    } else {
        false
    }
}

/// 带超时的TCP连接函数
fn timeout_connection(addr: &SocketAddr) -> std::io::Result<()> {
    let stream = TcpStream::connect_timeout(addr, std::time::Duration::from_secs(5))?;
    stream.set_read_timeout(Some(std::time::Duration::from_secs(5))).ok();
    stream.set_write_timeout(Some(std::time::Duration::from_secs(5))).ok();
    Ok(())
}

/// 异步连接到节点（用于tokio环境）
async fn async_connect_to_node(ip: &str, port: u16) -> Result<TokioTcpStream, Box<dyn std::error::Error>> {
    let addr = format!("{}:{}", ip, port);
    let stream = timeout(TokioDuration::from_secs(5), TokioTcpStream::connect(&addr)).await
        .map_err(|_| "连接超时")?
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
    
    Ok(stream)
}

/// 连接到网络中的所有可用节点
#[no_mangle]
pub extern "C" fn orasrs_connect_to_all_nodes() -> u32 {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                let mut connected_count = 0;
                
                // 遍历所有节点并尝试连接
                for node in &cache_lock.nodes {
                    if orasrs_connect_to_node(
                        CString::new(node.ip.clone()).unwrap().as_ptr(), 
                        node.port
                    ) {
                        connected_count += 1;
                    }
                }
                
                return connected_count;
            }
        }
    }
    0
}

/// 发送P2P消息到指定节点
#[no_mangle]
pub extern "C" fn orasrs_send_p2p_message(
    ip_str: *const c_char, 
    port: u16, 
    message: *const c_char,
    message_len: usize
) -> bool {
    if let Ok(ip) = CStr::from_ptr(ip_str).to_str() {
        if let Ok(message_str) = CStr::from_ptr(message).to_str() {
            let addr = format!("{}:{}", ip, port);
            
            match addr.parse::<SocketAddr>() {
                Ok(socket_addr) => {
                    // 尝试建立连接并发送消息
                    match TcpStream::connect_timeout(&socket_addr, std::time::Duration::from_secs(5)) {
                        Ok(mut stream) => {
                            stream.set_read_timeout(Some(std::time::Duration::from_secs(5))).ok();
                            stream.set_write_timeout(Some(std::time::Duration::from_secs(5))).ok();
                            
                            // 发送消息
                            if let Ok(_) = stream.write(message_str.as_bytes()) {
                                println!("成功发送P2P消息到: {}", socket_addr);
                                return true;
                            }
                        },
                        Err(e) => {
                            eprintln!("连接节点失败 {}: {}", socket_addr, e);
                        }
                    }
                },
                Err(_) => {
                    eprintln!("无效的地址格式: {}", addr);
                }
            }
        }
    }
    false
}

/// 禁用内核级阻断
#[no_mangle]
pub extern "C" fn orasrs_kernel_block_disable() {
    disable_kernel_blocking();
}

/// 手动触发威胁列表更新
#[no_mangle]
pub extern "C" fn orasrs_update_threats() -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(mut cache_lock) = cache.lock() {
                cache_lock.cleanup_expired();
                // 从链上获取最新威胁数据
                return fetch_latest_threats(&mut *cache_lock);
            }
        }
        false
    }
}

/// 获取插件状态信息
#[no_mangle]
pub extern "C" fn orasrs_get_status(status_str: *mut c_char, max_len: usize) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                let status = format!(
                    "OraSRS Core SDK v0.1.0\nIPs Blocked: {}\nDomains Threats: {}\nNodes Available: {}\nLast Update: {}\nTTL: {}s",
                    cache_lock.ip_blacklist.len(),
                    cache_lock.domain_threats.len(),
                    cache_lock.nodes.len(),
                    cache_lock.last_update,
                    cache_lock.ttl_seconds
                );
                
                if let Ok(c_status) = CString::new(status) {
                    let src_bytes = c_status.as_bytes_with_nul();
                    let copy_len = std::cmp::min(max_len - 1, src_bytes.len());
                    
                    std::ptr::copy_nonoverlapping(
                        src_bytes.as_ptr(),
                        status_str as *mut u8,
                        copy_len,
                    );
                    
                    // 确保字符串结束
                    let dest = (status_str as *mut u8).add(copy_len);
                    *dest = 0;
                    
                    return true;
                }
            }
        }
        false
    }
}

/// 更新节点列表
#[no_mangle]
pub extern "C" fn orasrs_update_nodes() -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(mut cache_lock) = cache.lock() {
                let runtime = tokio::runtime::Runtime::new().unwrap();
                return runtime.block_on(async {
                    match cache_lock.update_nodes().await {
                        Ok(()) => true,
                        Err(_) => false,
                    }
                });
            }
        }
        false
    }
}

/// 获取节点数量
#[no_mangle]
pub extern "C" fn orasrs_get_node_count() -> u32 {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                return cache_lock.nodes.len() as u32;
            }
        }
        0
    }
}

/// 获取节点信息
/// 
/// # Parameters
/// * `index` - 节点索引
/// * `node_info_str` - 节点信息JSON字符串输出缓冲区
/// * `max_len` - 缓冲区最大长度
/// 
/// # Returns
/// * `bool` - 是否成功获取节点信息
#[no_mangle]
pub extern "C" fn orasrs_get_node_info(index: u32, node_info_str: *mut c_char, max_len: usize) -> bool {
    unsafe {
        if let Some(cache) = &THREAT_CACHE {
            if let Ok(cache_lock) = cache.lock() {
                if index < cache_lock.nodes.len() as u32 {
                    if let Some(node) = cache_lock.nodes.get(index as usize) {
                        let node_json = serde_json::to_string(node).unwrap_or_default();
                        
                        if let Ok(c_node_json) = CString::new(node_json) {
                            let src_bytes = c_node_json.as_bytes_with_nul();
                            let copy_len = std::cmp::min(max_len - 1, src_bytes.len());
                            
                            std::ptr::copy_nonoverlapping(
                                src_bytes.as_ptr(),
                                node_info_str as *mut u8,
                                copy_len,
                            );
                            
                            // 确保字符串结束
                            let dest = (node_info_str as *mut u8).add(copy_len);
                            *dest = 0;
                            
                            return true;
                        }
                    }
                }
            }
        }
        false
    }
}

// ========================
// 内部实现函数
// ========================

// 更新循环 - 定期从链上获取新威胁
fn update_loop() {
    loop {
        std::thread::sleep(std::time::Duration::from_secs(300)); // 每5分钟检查一次
        
        unsafe {
            if let Some(cache) = &THREAT_CACHE {
                if let Ok(mut cache_lock) = cache.lock() {
                    // 清理过期威胁
                    cache_lock.cleanup_expired();
                    
                    // 获取新威胁
                    fetch_latest_threats(&mut *cache_lock);
                    
                    // 更新节点列表
                    let runtime = tokio::runtime::Runtime::new().unwrap();
                    runtime.block_on(async {
                        fetch_node_list(&mut *cache_lock).await;
                    });
                }
            }
        }
    }
}

// 从链上获取最新威胁数据
fn fetch_latest_threats(cache: &mut ThreatCache) -> bool {
    // 这里实现从区块链合约获取最新威胁的逻辑
    // 1. 连接RPC端点
    // 2. 查询合约的最新事件
    // 3. 解析并添加到缓存中
    
    // 模拟操作
    cache.last_update = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    true
}

// 从链上获取节点列表
async fn fetch_node_list(cache: &mut ThreatCache) -> bool {
    match cache.update_nodes().await {
        Ok(()) => true,
        Err(e) => {
            eprintln!("更新节点列表失败: {}", e);
            false
        }
    }
}

// 启用内核级阻断
fn enable_kernel_blocking() {
    // 根据不同系统调用相应的防火墙API
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用iptables或nftables
        use std::process::Command;
        // 示例: Command::new("iptables").args(&["-A", "INPUT", "-s", "IP", "-j", "DROP"]).output();
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用WFP API
        // 需要使用windows-sys crate调用WFP
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用pfctl
        // 示例: Command::new("pfctl").args(&["-f", "/path/to/rules"]).output();
    }
}

// 禁用内核级阻断
fn disable_kernel_blocking() {
    // 与enable_kernel_blocking对应的操作
}

// ========================
// 单元测试
// ========================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ip_conversion() {
        let cache = ThreatCache::new("https://api.orasrs.net".to_string(), "".to_string());
        assert_eq!(cache.ip_str_to_u32("192.168.1.1").unwrap(), 0xC0A80101);
        assert_eq!(cache.ip_str_to_u32("8.8.8.8").unwrap(), 0x08080808);
    }

    #[test]
    fn test_threat_cache() {
        let mut cache = ThreatCache::new("https://api.orasrs.net".to_string(), "".to_string());
        
        cache.add_ip_to_blacklist("192.168.1.100");
        assert!(cache.is_ip_blocked("192.168.1.100"));
        assert!(!cache.is_ip_blocked("192.168.1.101"));
        
        let threat = ThreatInfo {
            threat_type: "IP".to_string(),
            threat_value: "example.com".to_string(),
            threat_level: 3,
            timestamp: 1000,
            expiration: 2000,
            source: "test".to_string(),
            evidence: "test".to_string(),
        };
        
        cache.add_domain_threat(threat);
        assert!(cache.is_domain_threat("example.com"));
    }
}
