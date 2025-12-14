/**
 * OraSRS Egress Protection Module
 * Integrates eBPF egress filter with OraSRS client
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

class EgressProtection extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.enabled = config.egressProtection?.enabled || false;
        this.mode = config.egressProtection?.mode || 'monitor';
        this.interface = config.egressProtection?.interface || 'eth0';
        this.updateInterval = config.egressProtection?.cacheUpdateInterval || 300000; // 5 minutes
        this.riskThreshold = config.egressProtection?.riskThreshold || 80;

        this.ebpfProcess = null;
        this.updateTimer = null;
        this.riskCache = new Map();
    }

    /**
     * Start the egress protection module
     */
    async start(blockchainConnector) {
        if (!this.enabled) {
            console.log('[Egress] Egress protection disabled in configuration');
            return;
        }

        this.blockchainConnector = blockchainConnector;

        console.log(`[Egress] Starting egress protection in ${this.mode} mode...`);

        try {
            // Start eBPF loader
            await this.startEBPF();

            // Start cache update loop
            this.startCacheUpdates();

            console.log('[Egress] ✅ Egress protection started successfully');
        } catch (error) {
            console.error('[Egress] Failed to start:', error.message);
            this.enabled = false;
        }
    }

    /**
     * Start the eBPF loader process
     */
    async startEBPF() {
        return new Promise((resolve, reject) => {
            // Start Python eBPF loader
            this.ebpfProcess = spawn('python3', [
                '/opt/orasrs/ebpf/egress_loader.py',
                '--mode', this.mode,
                '--interface', this.interface,
                '--daemon'
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.ebpfProcess.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.log(`[Egress/eBPF] ${output}`);
                }
            });

            this.ebpfProcess.stderr.on('data', (data) => {
                const error = data.toString().trim();
                if (error && !error.includes('WARNING')) {
                    console.error(`[Egress/eBPF] ${error}`);
                }
            });

            this.ebpfProcess.on('error', (error) => {
                console.error('[Egress] eBPF process error:', error.message);
                reject(error);
            });

            this.ebpfProcess.on('exit', (code) => {
                if (code !== 0 && code !== null) {
                    console.error(`[Egress] eBPF process exited with code ${code}`);
                }
            });

            // Give it a moment to start
            setTimeout(() => {
                if (this.ebpfProcess && !this.ebpfProcess.killed) {
                    resolve();
                } else {
                    reject(new Error('eBPF process failed to start'));
                }
            }, 2000);
        });
    }

    /**
     * Start periodic cache updates
     */
    startCacheUpdates() {
        console.log(`[Egress] Starting cache updates every ${this.updateInterval / 1000}s`);

        // Initial update
        this.updateRiskCache();

        // Periodic updates
        this.updateTimer = setInterval(() => {
            this.updateRiskCache();
        }, this.updateInterval);
    }

    /**
     * Update risk cache from blockchain
     */
    async updateRiskCache() {
        try {
            console.log('[Egress] Updating risk cache...');

            // Get high-risk IPs from blockchain
            const highRiskIPs = await this.getHighRiskIPs();

            let updateCount = 0;
            for (const ipData of highRiskIPs) {
                await this.updateIPRisk(ipData.ip, ipData.score, ipData.isBlocked);
                updateCount++;
            }

            console.log(`[Egress] ✅ Updated ${updateCount} high-risk IPs in cache`);
            this.emit('cache-updated', { count: updateCount });

        } catch (error) {
            console.error('[Egress] Failed to update risk cache:', error.message);
        }
    }

    /**
     * Get high-risk IPs from blockchain
     */
    async getHighRiskIPs() {
        // In production, query blockchain for high-risk IPs
        // For now, use local threat detection data

        const highRiskIPs = [];

        // Query local threat database
        if (this.blockchainConnector) {
            try {
                // This would query the blockchain for IPs with score >= threshold
                // Simplified implementation
                const cachedThreats = this.blockchainConnector.threatCache || new Map();

                for (const [ip, data] of cachedThreats) {
                    if (data.risk_score >= this.riskThreshold) {
                        highRiskIPs.push({
                            ip: ip,
                            score: data.risk_score,
                            isBlocked: data.risk_score >= 90
                        });
                    }
                }
            } catch (error) {
                console.error('[Egress] Error querying threats:', error.message);
            }
        }

        return highRiskIPs;
    }

    /**
     * Update risk for a specific IP
     */
    async updateIPRisk(ipAddress, score, isBlocked = false) {
        if (!this.ebpfProcess || this.ebpfProcess.killed) {
            return;
        }

        try {
            // Send update command to eBPF loader via stdin
            const command = JSON.stringify({
                action: 'update',
                ip: ipAddress,
                score: score,
                isBlocked: isBlocked,
                ttl: 3600 // 1 hour
            }) + '\n';

            this.ebpfProcess.stdin.write(command);

            // Update local cache
            this.riskCache.set(ipAddress, {
                score: score,
                isBlocked: isBlocked,
                updatedAt: Date.now()
            });

        } catch (error) {
            console.error(`[Egress] Failed to update IP ${ipAddress}:`, error.message);
        }
    }

    /**
     * Get statistics from eBPF filter
     */
    async getStatistics() {
        if (!this.enabled || !this.ebpfProcess) {
            return null;
        }

        return {
            enabled: this.enabled,
            mode: this.mode,
            interface: this.interface,
            cacheSize: this.riskCache.size,
            riskThreshold: this.riskThreshold
        };
    }

    /**
     * Stop the egress protection module
     */
    stop() {
        console.log('[Egress] Stopping egress protection...');

        // Stop cache updates
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        // Stop eBPF process
        if (this.ebpfProcess && !this.ebpfProcess.killed) {
            this.ebpfProcess.kill('SIGTERM');
            this.ebpfProcess = null;
        }

        this.riskCache.clear();
        console.log('[Egress] Egress protection stopped');
    }
}

export default EgressProtection;
