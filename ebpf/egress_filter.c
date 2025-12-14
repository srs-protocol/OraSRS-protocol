// SPDX-License-Identifier: GPL-2.0
// OraSRS eBPF Egress Filter
// Kernel-level outbound traffic inspection

#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/in.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

// Risk information structure
struct risk_info {
    __u32 score;        // Risk score (0-100)
    __u8 is_blocked;    // 1 if blocked, 0 if allowed
    __u64 expiry;       // Expiry timestamp
};

// BPF map for risk cache
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10000);
    __type(key, __u32);           // Destination IP
    __type(value, struct risk_info);
} risk_cache SEC(".maps");

// Configuration map
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 1);
    __type(key, __u32);
    __type(value, __u32);  // 0 = disabled, 1 = monitor, 2 = enforce
} config_map SEC(".maps");

// Statistics map
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 4);
    __type(key, __u32);
    __type(value, __u64);
} stats_map SEC(".maps");

#define STAT_TOTAL_PACKETS    0
#define STAT_HIGH_RISK_HITS   1
#define STAT_BLOCKED_PACKETS  2
#define STAT_ALLOWED_PACKETS  3

#define MODE_DISABLED  0
#define MODE_MONITOR   1
#define MODE_ENFORCE   2

#define RISK_THRESHOLD 80

// Helper function to update statistics
static __always_inline void update_stat(__u32 stat_id) {
    __u64 *value = bpf_map_lookup_elem(&stats_map, &stat_id);
    if (value) {
        __sync_fetch_and_add(value, 1);
    }
}

SEC("xdp_egress_filter")
int egress_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;
    
    // Parse Ethernet header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) {
        return XDP_PASS;
    }
    
    // Only process IPv4
    if (eth->h_proto != bpf_htons(ETH_P_IP)) {
        return XDP_PASS;
    }
    
    // Parse IP header
    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end) {
        return XDP_PASS;
    }
    
    // Get destination IP
    __u32 dest_ip = ip->daddr;
    
    // Update total packets counter
    update_stat(STAT_TOTAL_PACKETS);
    
    // Get configuration mode
    __u32 key = 0;
    __u32 *mode = bpf_map_lookup_elem(&config_map, &key);
    if (!mode || *mode == MODE_DISABLED) {
        return XDP_PASS;
    }
    
    // Look up risk information
    struct risk_info *risk = bpf_map_lookup_elem(&risk_cache, &dest_ip);
    if (!risk) {
        // No risk info, allow
        update_stat(STAT_ALLOWED_PACKETS);
        return XDP_PASS;
    }
    
    // Check expiry
    __u64 now = bpf_ktime_get_ns() / 1000000000;  // Convert to seconds
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
            bpf_printk("[OraSRS] WARNING: Connection to high-risk IP %pI4 (score: %d), monitor mode - allowed\n",
                      &dest_ip, risk->score);
            update_stat(STAT_ALLOWED_PACKETS);
            return XDP_PASS;
        } else if (*mode == MODE_ENFORCE) {
            // Enforce mode: actually block
            bpf_printk("[OraSRS] BLOCKED: Connection to high-risk IP %pI4 (score: %d)\n",
                      &dest_ip, risk->score);
            update_stat(STAT_BLOCKED_PACKETS);
            return XDP_DROP;
        }
    }
    
    // Low risk, allow
    update_stat(STAT_ALLOWED_PACKETS);
    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
