import axios from 'axios';
import { ethers } from 'ethers';

/**
 * OraSRS Client SDK
 * Allows applications to interact with OraSRS protocol.
 */
class OraSRSClient {
    constructor(config = {}) {
        this.config = {
            apiEndpoint: config.apiEndpoint || 'http://127.0.0.1:3006',
            blockchainEndpoint: config.blockchainEndpoint || 'https://api.orasrs.net',
            contractAddress: config.contractAddress,
            ...config
        };
    }

    /**
     * Query IP risk score
     * @param {string} ip IP address to query
     */
    async query(ip) {
        try {
            const response = await axios.get(`${this.config.apiEndpoint}/orasrs/v1/query?ip=${ip}`);
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
     */
    async report(ip, reason, privateKey) {
        if (!privateKey) throw new Error("Private key required");

        const provider = new ethers.JsonRpcProvider(this.config.blockchainEndpoint);
        const wallet = new ethers.Wallet(privateKey, provider);

        // ABI for reportThreat
        const abi = [
            "function reportThreat(string memory ip, string memory reason, bytes memory signature) public"
        ];

        // Use configured address or default (should be fetched from Registry in production)
        const address = this.config.contractAddress || '0xCA8c8688914e0F7096c920146cd0Ad85cD7Ae8b9';

        const contract = new ethers.Contract(address, abi, wallet);
        const tx = await contract.reportThreat(ip, reason, "0x");
        return await tx.wait();
    }

    /**
     * Sync threat data
     */
    async sync() {
        try {
            const response = await axios.post(`${this.config.apiEndpoint}/orasrs/v1/sync`);
            return response.data;
        } catch (error) {
            throw new Error(`Sync failed: ${error.message}`);
        }
    }
}

export default OraSRSClient;
