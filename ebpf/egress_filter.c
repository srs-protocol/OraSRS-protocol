// SPDX-License-Identifier: GPL-2.0
// OraSRS eBPF Egress Filter
// Kernel-level outbound traffic inspection
// BCC-compatible version

#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/in.h>

// Risk information structure
struct risk_info {
    u32 score;        // Risk score (0-100)
    u8 is_blocked;    // 1 if blocked, 0 if allowed
    u64 expiry;       // Expiry timestamp
};

// BPF maps using BCC syntax
BPF_HASH(risk_cache, u32, struct risk_info, 10000);
BPF_ARRAY(config_map, u32, 1);
BPF_ARRAY(stats_map, u64, 4);

#define STAT_TOTAL_PACKETS    0
#define STAT_HIGH_RISK_HITS   1
#define STAT_BLOCKED_PACKETS  2
#define STAT_ALLOWED_PACKETS  3

#define MODE_DISABLED  0
#define MODE_MONITOR   1
#define MODE_ENFORCE   2

#define RISK_THRESHOLD 80

// Helper function to update statistics
static inline void update_stat(u32 stat_id) {
    u64 *value = stats_map.lookup(&stat_id);
    if (value) {
        lock_xadd(value, 1);
    }
}

int egress_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;
    
    // Parse Ethernet header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) {
        return XDP_PASS;
    }
    
    // Only process IPv4
    if (eth->h_proto != htons(ETH_P_IP)) {
        return XDP_PASS;
    }
    
    // Parse IP header
    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end) {
        return XDP_PASS;
    }
    
    // Get destination IP
    u32 dest_ip = ip->daddr;
    
    // Update total packets counter
    update_stat(STAT_TOTAL_PACKETS);
    
    // Get configuration mode
    u32 key = 0;
    u32 *mode = config_map.lookup(&key);
    if (!mode || *mode == MODE_DISABLED) {
        return XDP_PASS;
    }
    
    // Look up risk information
    struct risk_info *risk = risk_cache.lookup(&dest_ip);
    if (!risk) {
        // No risk info, allow
        update_stat(STAT_ALLOWED_PACKETS);
        return XDP_PASS;
    }
    
    // Check expiry
    u64 now = bpf_ktime_get_ns() / 1000000000;  // Convert to seconds
    if (now > risk->expiry) {
        // Expired, allow
        update_stat(STAT_ALLOWED_PACKETS);
        return XDP_PASS;
    }
    
    // Check risk score
    if (risk->score >= RISK_THRESHOLD) {
        update_stat(STAT_HIGH_RISK_HITS);
        
        if (*mode == MODE_MONITOR) {
            // Monitor mode: log but don't block
            bpf_trace_printk("[OraSRS] WARNING: Connection to high-risk IP (score: %d), monitor mode - allowed\\n", risk->score);
            update_stat(STAT_ALLOWED_PACKETS);
            return XDP_PASS;
        } else if (*mode == MODE_ENFORCE) {
            // Enforce mode: actually block
            bpf_trace_printk("[OraSRS] BLOCKED: Connection to high-risk IP (score: %d)\\n", risk->score);
            update_stat(STAT_BLOCKED_PACKETS);
            return XDP_DROP;
        }
    }
    
    // Low risk, allow
    update_stat(STAT_ALLOWED_PACKETS);
    return XDP_PASS;
}
