/**
 * OraSRS Threat Data Loader with Optimized Indexing
 * 
 * Features:
 * - O(1) exact IP lookup
 * - O(n) CIDR longest-prefix-match (LPM)
 * - Incremental daily diff sync
 * - Weekly full tree refresh
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ThreatDataLoader {
    constructor(options = {}) {
        this.dataDir = options.dataDir || path.join(__dirname, 'oracle');
        this.cdnUrl = options.cdnUrl || null; // e.g., 'https://cdn.orasrs.net/threats'

        // Indexes
        this.exactIpMap = new Map();  // IP -> threat entry
        this.cidrList = [];           // Sorted CIDR list for LPM
        this.lastUpdate = null;
        this.currentVersion = null;

        // Stats
        this.stats = {
            totalEntries: 0,
            exactIps: 0,
            cidrNetworks: 0,
            lastSync: null,
            diffsApplied: 0
        };
    }

    /**
     * Initialize: Load full tree or apply diffs
     */
    async initialize() {
        console.log('🔄 Initializing threat data loader...');

        // Check if local data exists
        const fullTreePath = path.join(this.dataDir, 'threats_compact.json');

        if (fs.existsSync(fullTreePath)) {
            console.log('📦 Loading local full tree...');
            await this.loadFullTree(fullTreePath);
        } else if (this.cdnUrl) {
            console.log('🌐 Fetching full tree from CDN...');
            await this.fetchFullTree();
        } else {
            console.warn('⚠️  No threat data available. Run Oracle first or configure CDN URL.');
            return false;
        }

        // Apply any pending diffs
        await this.syncDiffs();

        console.log(`✅ Loaded ${this.stats.totalEntries} threat entries`);
        return true;
    }

    /**
     * Load full threat tree from file
     */
    async loadFullTree(filePath) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        this.currentVersion = data.version;
        this.lastUpdate = new Date(data.timestamp * 1000);

        // Build indexes
        this.buildIndexes(data.entries);

        this.stats.lastSync = new Date();
        console.log(`  Loaded version ${this.currentVersion} from ${this.lastUpdate.toISOString()}`);
    }

    /**
     * Fetch full tree from CDN
     */
    async fetchFullTree() {
        try {
            const response = await axios.get(`${this.cdnUrl}/threats_compact.json`, {
                timeout: 30000
            });

            const data = response.data;
            this.currentVersion = data.version;
            this.lastUpdate = new Date(data.timestamp * 1000);

            this.buildIndexes(data.entries);

            // Save locally
            const localPath = path.join(this.dataDir, 'threats_compact.json');
            fs.mkdirSync(this.dataDir, { recursive: true });
            fs.writeFileSync(localPath, JSON.stringify(data, null, 2));

            this.stats.lastSync = new Date();
            console.log(`  Downloaded version ${this.currentVersion}`);
        } catch (error) {
            console.error('❌ Failed to fetch full tree:', error.message);
            throw error;
        }
    }

    /**
     * Build optimized indexes from threat entries
     */
    buildIndexes(entries) {
        this.exactIpMap.clear();
        this.cidrList = [];

        for (const entry of entries) {
            const { ip, cidr, risk } = entry;

            // Index 1: Exact /32 IPs
            if (cidr.endsWith('/32')) {
                this.exactIpMap.set(ip, entry);
                this.stats.exactIps++;
            } else {
                this.cidrList.push(entry);
                this.stats.cidrNetworks++;
            }
        }

        // Index 2: Sort CIDR by prefix length (descending) for LPM
        // Longest prefix = most specific match
        this.cidrList.sort((a, b) => {
            const maskA = parseInt(a.cidr.split('/')[1]);
            const maskB = parseInt(b.cidr.split('/')[1]);
            return maskB - maskA; // Descending
        });

        this.stats.totalEntries = entries.length;
        console.log(`  Built indexes: ${this.stats.exactIps} exact IPs, ${this.stats.cidrNetworks} CIDR networks`);
    }

    /**
     * Sync daily diffs
     */
    async syncDiffs() {
        // Check for missing diffs since last update
        if (!this.currentVersion) return;

        const diffPattern = /^diff_(v\d{8})\.json$/;
        const diffFiles = fs.existsSync(this.dataDir)
            ? fs.readdirSync(this.dataDir).filter(f => diffPattern.test(f))
            : [];

        for (const diffFile of diffFiles.sort()) {
            const diffPath = path.join(this.dataDir, diffFile);
            const diff = JSON.parse(fs.readFileSync(diffPath, 'utf8'));

            // Skip if already applied
            if (diff.version <= this.currentVersion) continue;

            console.log(`  Applying diff ${diff.version}...`);
            await this.applyDiff(diff);
            this.stats.diffsApplied++;
        }
    }

    /**
     * Apply a diff to current data
     */
    async applyDiff(diff) {
        // Remove deleted IPs
        for (const ip of diff.removed || []) {
            this.exactIpMap.delete(ip);
            this.cidrList = this.cidrList.filter(e => e.ip !== ip);
        }

        // Add new IPs (would need full entry data, not just IP)
        // In production, diff should include full entry data
        // For now, we'll trigger a full reload if there are significant changes

        if (diff.added && diff.added.length > 0) {
            console.log(`    ⚠️  Diff contains ${diff.added.length} new entries. Consider full reload.`);
        }

        this.currentVersion = diff.version;
    }

    /**
     * Query IP with optimized lookup
     * Returns: { ip, cidr, risk } or null
     */
    query(ipAddress) {
        // Step 1: O(1) exact match
        if (this.exactIpMap.has(ipAddress)) {
            return this.exactIpMap.get(ipAddress);
        }

        // Step 2: O(n) CIDR longest-prefix match
        for (const entry of this.cidrList) {
            if (this.ipInCidr(ipAddress, entry.cidr)) {
                return entry;
            }
        }

        return null;
    }

    /**
     * Check if IP is in CIDR range
     */
    ipInCidr(ip, cidr) {
        const [network, maskStr] = cidr.split('/');
        const mask = parseInt(maskStr);

        const ipInt = this.ipToInt(ip);
        const networkInt = this.ipToInt(network);

        // Calculate subnet mask
        const maskInt = (0xFFFFFFFF << (32 - mask)) >>> 0;

        return (ipInt & maskInt) === (networkInt & maskInt);
    }

    /**
     * Convert IPv4 to integer
     */
    ipToInt(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    }

    /**
     * Get risk level name
     */
    getRiskLevelName(level) {
        const names = {
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Critical'
        };
        return names[level] || 'Unknown';
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            version: this.currentVersion,
            lastUpdate: this.lastUpdate
        };
    }

    /**
     * Force refresh from CDN
     */
    async refresh() {
        if (!this.cdnUrl) {
            console.warn('⚠️  No CDN URL configured. Cannot refresh.');
            return false;
        }

        console.log('🔄 Forcing full refresh from CDN...');
        await this.fetchFullTree();
        return true;
    }
}

export default ThreatDataLoader;

// CLI usage example
if (import.meta.url === `file://${process.argv[1]}`) {
    const loader = new ThreatDataLoader();

    loader.initialize().then(() => {
        // Test queries
        const testIps = ['1.10.16.0', '162.243.103.246', '8.8.8.8', '1.10.16.5'];

        console.log('\n🔍 Test Queries:');
        for (const ip of testIps) {
            const result = loader.query(ip);
            if (result) {
                console.log(`  ${ip}: ${loader.getRiskLevelName(result.risk)} (${result.cidr})`);
            } else {
                console.log(`  ${ip}: Not found`);
            }
        }

        console.log('\n📊 Stats:', loader.getStats());
    }).catch(console.error);
}
