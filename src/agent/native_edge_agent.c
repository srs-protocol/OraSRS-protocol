// src/agent/native_edge_agent.c - Memory Optimization Reference Implementation
// Implements strict memory limits for <5MB requirement

#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/resource.h>
#include <string.h>

#include <stdint.h>

// Mock libbpf if not available
#ifndef HAS_LIBBPF
struct bpf_object {};
struct bpf_object *bpf_object__open(const char *path) { 
    // Return NULL occasionally for testing fallback if needed, or just mock success
    // For this demo, we return a mock object unless file check fails (which we don't do here)
    return malloc(sizeof(struct bpf_object)); 
}
int bpf_object__load(struct bpf_object *obj) { return 0; }
#else
#include <bpf/libbpf.h>
#endif

#define MAX_STACK_SIZE 512      // Strict stack size limit
#define HEAP_LIMIT 3 * 1024 * 1024  // 3MB Heap limit

// 4KB memory tracker in data section
static char __attribute__((section(".data.mem_usage"), used)) 
memory_tracker[4096] = {0};

void update_threat_maps(struct bpf_object *obj) {
    // Simulate map update
}

void load_fallback_rules(const uint32_t *rules, int count) {
    printf("[NativeAgent] Loaded %d fallback rules\n", count);
}

int main(int argc, char **argv) {
    // Disable standard library buffering
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stderr, NULL, _IONBF, 0);
    
    printf("[NativeAgent] Starting strict memory mode...\n");
    
    // Limit process resources
    struct rlimit rl = {.rlim_cur = HEAP_LIMIT, .rlim_max = HEAP_LIMIT};
    if (setrlimit(RLIMIT_DATA, &rl) != 0) {
        perror("setrlimit failed (warning)");
    }
    
    // Core logic: Load eBPF program
    struct bpf_object *obj = bpf_object__open("orasrs_kern.o");
    if (!obj) {
        // Fallback mode
        printf("[NativeAgent] BPF object missing - activating fallback mode\n");
        static const uint32_t fallback_rules[] = {0x24080000}; // 36.8.0.0/16
        load_fallback_rules(fallback_rules, 1);
    } else {
        bpf_object__load(obj);
        printf("[NativeAgent] eBPF object loaded\n");
    }
    
    // Test mode
    if (argc > 1 && strcmp(argv[1], "--test-mode") == 0) {
        printf("[NativeAgent] Test mode active. Sleeping 5s...\n");
        sleep(5);
        return 0;
    }

    // Stress test mode
    if (argc > 1 && strcmp(argv[1], "--stress-test") == 0) {
        printf("[NativeAgent] Stress test active...\n");
        // Simulate load
        for(int i=0; i<50; i++) {
            void *p = malloc(1024 * 50); // 50KB
            if(p) {
                memset(p, 0, 1024 * 50);
                free(p);
            }
            usleep(50000); // 50ms
        }
        printf("[NativeAgent] Stress test loop entering wait...\n");
        while(1) sleep(1);
    }
    
    // Main loop: Minimize memory footprint
    printf("[NativeAgent] Entering main loop\n");
    while (1) {
        sleep(60);  // Low power polling
        if (obj) update_threat_maps(obj);
    }
    
    return 0;
}
