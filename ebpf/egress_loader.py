#!/usr/bin/env python3
"""
OraSRS eBPF Egress Filter Loader
Loads and manages the eBPF egress filter program
"""

import os
import sys
import time
import struct
import socket
from bcc import BPF

class EgressFilter:
    def __init__(self, mode='monitor', interface='eth0'):
        """
        Initialize eBPF egress filter
        
        Args:
            mode: 'disabled', 'monitor', or 'enforce'
            interface: Network interface to attach to
        """
        self.mode_map = {
            'disabled': 0,
            'monitor': 1,
            'enforce': 2
        }
        
        if mode not in self.mode_map:
            raise ValueError(f"Invalid mode: {mode}. Must be one of {list(self.mode_map.keys())}")
        
        self.mode = mode
        self.interface = interface
        self.bpf = None
        
    def load(self):
        """Load the eBPF program"""
        print(f"[OraSRS] Loading eBPF egress filter in {self.mode} mode...")
        
        # Load BPF program
        with open('/opt/orasrs/ebpf/egress_filter.c', 'r') as f:
            bpf_code = f.read()
        
        self.bpf = BPF(text=bpf_code)
        
        # Get the function
        fn = self.bpf.load_func("egress_filter", BPF.XDP)
        
        # Attach to interface
        self.bpf.attach_xdp(self.interface, fn, 0)
        
        # Set mode
        config_map = self.bpf.get_table("config_map")
        config_map[0] = struct.pack('I', self.mode_map[self.mode])
        
        print(f"[OraSRS] eBPF filter attached to {self.interface}")
        
    def unload(self):
        """Unload the eBPF program"""
        if self.bpf:
            print("[OraSRS] Unloading eBPF egress filter...")
            self.bpf.remove_xdp(self.interface, 0)
            self.bpf = None
            
    def update_risk_cache(self, ip_address, score, is_blocked=False, ttl=3600):
        """
        Update risk cache for an IP
        
        Args:
            ip_address: IP address string (e.g., "1.2.3.4")
            score: Risk score (0-100)
            is_blocked: Whether IP is blocked
            ttl: Time to live in seconds
        """
        if not self.bpf:
            raise RuntimeError("eBPF program not loaded")
        
        # Convert IP to integer
        ip_int = struct.unpack("!I", socket.inet_aton(ip_address))[0]
        
        # Calculate expiry
        expiry = int(time.time()) + ttl
        
        # Update map
        risk_cache = self.bpf.get_table("risk_cache")
        risk_info = struct.pack('IBQ', score, 1 if is_blocked else 0, expiry)
        risk_cache[struct.pack('I', ip_int)] = risk_info
        
        print(f"[OraSRS] Updated risk cache: {ip_address} -> score={score}, blocked={is_blocked}, ttl={ttl}s")
        
    def get_statistics(self):
        """Get filter statistics"""
        if not self.bpf:
            return None
        
        stats_map = self.bpf.get_table("stats_map")
        
        stats = {
            'total_packets': struct.unpack('Q', stats_map[0])[0],
            'high_risk_hits': struct.unpack('Q', stats_map[1])[0],
            'blocked_packets': struct.unpack('Q', stats_map[2])[0],
            'allowed_packets': struct.unpack('Q', stats_map[3])[0],
        }
        
        return stats
        
    def print_statistics(self):
        """Print filter statistics"""
        stats = self.get_statistics()
        if stats:
            print("\n[OraSRS] eBPF Egress Filter Statistics:")
            print(f"  Total Packets:    {stats['total_packets']}")
            print(f"  High Risk Hits:   {stats['high_risk_hits']}")
            print(f"  Blocked Packets:  {stats['blocked_packets']}")
            print(f"  Allowed Packets:  {stats['allowed_packets']}")
            
            if stats['total_packets'] > 0:
                block_rate = (stats['blocked_packets'] / stats['total_packets']) * 100
                print(f"  Block Rate:       {block_rate:.2f}%")

def main():
    import argparse
    import json
    import select
    
    parser = argparse.ArgumentParser(description='OraSRS eBPF Egress Filter')
    parser.add_argument('--mode', choices=['disabled', 'monitor', 'enforce'], 
                       default='monitor', help='Filter mode')
    parser.add_argument('--interface', default='eth0', help='Network interface')
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    
    args = parser.parse_args()
    
    filter = EgressFilter(mode=args.mode, interface=args.interface)
    
    try:
        filter.load()
        
        if args.daemon:
            print("[OraSRS] Running in daemon mode. Press Ctrl+C to stop.")
            print("[OraSRS] Listening for commands on stdin...")
            
            while True:
                # Check for stdin input (non-blocking)
                if select.select([sys.stdin], [], [], 1)[0]:
                    try:
                        line = sys.stdin.readline().strip()
                        if line:
                            command = json.loads(line)
                            
                            if command.get('action') == 'update':
                                ip = command.get('ip')
                                score = command.get('score', 0)
                                is_blocked = command.get('isBlocked', False)
                                ttl = command.get('ttl', 3600)
                                
                                filter.update_risk_cache(ip, score, is_blocked, ttl)
                            
                            elif command.get('action') == 'stats':
                                filter.print_statistics()
                    
                    except json.JSONDecodeError:
                        pass  # Ignore invalid JSON
                    except Exception as e:
                        print(f"[OraSRS] Command error: {e}")
                
                # Print stats every 60 seconds
                time.sleep(60)
                filter.print_statistics()
        else:
            print("[OraSRS] eBPF filter loaded. Run with --daemon to keep running.")
            
    except KeyboardInterrupt:
        print("\n[OraSRS] Shutting down...")
    finally:
        filter.unload()

if __name__ == '__main__':
    main()
