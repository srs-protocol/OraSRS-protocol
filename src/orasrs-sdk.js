import axios from 'axios';
import { ethers } from 'ethers';
import { EventEmitter } from 'events';

/**
 * OraSRS Client SDK
 * Allows applications to interact with OraSRS protocol.
 * 
 * @example
 * const client = new OraSRSClient({ apiEndpoint: 'http://localhost:3006' });
 * const result = await client.query('45.135.193.0');
 * console.log(result);
 */
class OraSRSClient extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            apiEndpoint: config.apiEndpoint || 'http://127.0.0.1:3006',
            blockchainEndpoint: config.blockchainEndpoint || 'https://api.orasrs.net',
            contractAddress: config.contractAddress,
            timeout: config.timeout || 10000,
            autoCacheManagement: config.autoCacheManagement !== false,
            ...config
        };

        // Initialize auto-sync if enabled
        if (this.config.autoCacheManagement) {
            this._startAutoSync();
        }
    }

    /**
     * Start automatic cache synchronization
     * @private
     */
    _startAutoSync() {
        if (this._syncInterval) clearInterval(this._syncInterval);

        // Sync every hour by default
        const interval = this.config.syncInterval || 3600000;
        this._syncInterval = setInterval(async () => {
            try {
                await this.sync();
                this.emit('sync-complete', { timestamp: new Date() });
            } catch (error) {
                this.emit('sync-error', error);
            }
        }, interval);
    }

    /**
     * Stop automatic cache synchronization
     */
    stopAutoSync() {
        if (this._syncInterval) {
            clearInterval(this._syncInterval);
            this._syncInterval = null;
        }
    }

    /**
     * Query IP risk score
     * @param {string} ip IP address to query
     * @param {Object} options Query options
     * @param {string} options.format Output format: 'json' (default) or 'pretty'
     * @param {boolean} options.cacheFirst Prefer cache over blockchain query
     * @returns {Promise<Object>} Risk assessment result
     */
    async query(ip, options = {}) {
        try {
            const params = new URLSearchParams({ ip });
            if (options.cacheFirst) params.append('cache_first', 'true');

            const response = await axios.get(
                `${this.config.apiEndpoint}/orasrs/v1/query?${params}`,
                { timeout: this.config.timeout }
            );

            this.emit('query', { ip, result: response.data });
            return response.data;
        } catch (error) {
            throw new Error(`Query failed: ${error.message}`);
        }
    }

    /**
     * Report a threat (requires private key)
     * @param {string} ip Threat IP
     * @param {string} reason Reason
     * @param {string} privateKey Private key to sign transaction
     * @returns {Promise<Object>} Transaction receipt
     */
    async report(ip, reason, privateKey) {
        if (!privateKey) throw new Error("Private key required");

        const provider = new ethers.JsonRpcProvider(this.config.blockchainEndpoint);
        const wallet = new ethers.Wallet(privateKey, provider);

        // ABI for reportThreat
        const abi = [
            "function reportThreat(string memory ip, string memory reason, bytes memory signature) public"
        ];

        // Use configured address or default
        const address = this.config.contractAddress || '0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9';

        const contract = new ethers.Contract(address, abi, wallet);
        const tx = await contract.reportThreat(ip, reason, "0x");

        const receipt = await tx.wait();
        this.emit('threat-reported', { ip, reason, tx: receipt });

        return receipt;
    }

    /**
     * Sync threat data from blockchain
     * @param {Object} options Sync options
     * @param {boolean} options.force Force full sync instead of incremental
     * @returns {Promise<Object>} Sync result with statistics
     */
    async sync(options = {}) {
        try {
            const endpoint = options.force
                ? `${this.config.apiEndpoint}/orasrs/v1/sync?force=true`
                : `${this.config.apiEndpoint}/orasrs/v1/sync`;

            const response = await axios.post(endpoint, {}, { timeout: 30000 });

            this.emit('sync-complete', response.data);
            return response.data;
        } catch (error) {
            this.emit('sync-error', error);
            throw new Error(`Sync failed: ${error.message}`);
        }
    }

    // Whitelist Management

    /**
     * Add IP to whitelist
     * @param {string} ip IP address to whitelist
     * @returns {Promise<Object>} Operation result
     */
    async addToWhitelist(ip) {
        try {
            const response = await axios.post(
                `${this.config.apiEndpoint}/orasrs/v1/whitelist/add`,
                { ip },
                { timeout: this.config.timeout }
            );

            this.emit('whitelist-updated', { action: 'add', ip });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to add to whitelist: ${error.message}`);
        }
    }

    /**
     * Remove IP from whitelist
     * @param {string} ip IP address to remove
     * @returns {Promise<Object>} Operation result
     */
    async removeFromWhitelist(ip) {
        try {
            const response = await axios.post(
                `${this.config.apiEndpoint}/orasrs/v1/whitelist/remove`,
                { ip },
                { timeout: this.config.timeout }
            );

            this.emit('whitelist-updated', { action: 'remove', ip });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to remove from whitelist: ${error.message}`);
        }
    }

    /**
     * List all whitelisted IPs
     * @returns {Promise<Array<string>>} Array of whitelisted IPs
     */
    async listWhitelist() {
        try {
            const response = await axios.get(
                `${this.config.apiEndpoint}/orasrs/v1/whitelist`,
                { timeout: this.config.timeout }
            );
            return response.data.whitelist || [];
        } catch (error) {
            throw new Error(`Failed to list whitelist: ${error.message}`);
        }
    }

    /**
     * Check if IP is whitelisted
     * @param {string} ip IP address to check
     * @returns {Promise<boolean>} True if whitelisted
     */
    async checkWhitelist(ip) {
        try {
            const whitelist = await this.listWhitelist();
            return whitelist.includes(ip);
        } catch (error) {
            throw new Error(`Failed to check whitelist: ${error.message}`);
        }
    }

    // Cache Management

    /**
     * Get cache status
     * @returns {Promise<Object>} Cache statistics
     */
    async getCacheStatus() {
        try {
            const response = await axios.get(
                `${this.config.apiEndpoint}/orasrs/v1/cache/status`,
                { timeout: this.config.timeout }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get cache status: ${error.message}`);
        }
    }

    /**
     * Clear all cache
     * @returns {Promise<Object>} Operation result
     */
    async clearCache() {
        try {
            const response = await axios.post(
                `${this.config.apiEndpoint}/orasrs/v1/cache/clear`,
                {},
                { timeout: this.config.timeout }
            );

            this.emit('cache-cleared', { timestamp: new Date() });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to clear cache: ${error.message}`);
        }
    }

    /**
     * Rebuild cache from blockchain
     * @returns {Promise<Object>} Rebuild result with statistics
     */
    async rebuildCache() {
        try {
            await this.clearCache();
            const syncResult = await this.sync({ force: true });

            this.emit('cache-rebuilt', syncResult);
            return syncResult;
        } catch (error) {
            throw new Error(`Failed to rebuild cache: ${error.message}`);
        }
    }

    // Statistics

    /**
     * Get client statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStats() {
        try {
            const response = await axios.get(
                `${this.config.apiEndpoint}/orasrs/v1/threats/stats`,
                { timeout: this.config.timeout }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Get threat statistics
     * @returns {Promise<Object>} Threat-specific statistics
     */
    async getThreatStats() {
        return this.getStats(); // Alias for consistency
    }

    /**
     * Get detected threats list
     * @returns {Promise<Array>} Array of detected threats
     */
    async getDetectedThreats() {
        try {
            const response = await axios.get(
                `${this.config.apiEndpoint}/orasrs/v1/threats/detected`,
                { timeout: this.config.timeout }
            );
            return response.data.threats || [];
        } catch (error) {
            throw new Error(`Failed to get detected threats: ${error.message}`);
        }
    }

    /**
     * Get client health status
     * @returns {Promise<Object>} Health status
     */
    async getHealth() {
        try {
            const response = await axios.get(
                `${this.config.apiEndpoint}/health`,
                { timeout: this.config.timeout }
            );
            return response.data;
        } catch (error) {
            throw new Error(`Health check failed: ${error.message}`);
        }
    }

    /**
     * Batch query multiple IPs
     * @param {Array<string>} ips Array of IP addresses
     * @returns {Promise<Array>} Array of query results
     */
    async batchQuery(ips) {
        try {
            const promises = ips.map(ip => this.query(ip));
            return await Promise.all(promises);
        } catch (error) {
            throw new Error(`Batch query failed: ${error.message}`);
        }
    }

    /**
     * Close and cleanup
     */
    destroy() {
        this.stopAutoSync();
        this.removeAllListeners();
    }
}

export default OraSRSClient;

