/**
 * OraSRS Client Voting Module
 * Enables qualified nodes to participate in governance voting
 */

const axios = require('axios');
const { ethers } = require('ethers');

class VotingModule {
    constructor(config) {
        this.config = config;
        this.provider = null;
        this.wallet = null;
        this.governanceContract = null;
        this.isQualified = false;
        this.votingEnabled = config.voting?.enabled || false;
    }

    /**
     * Initialize the voting module
     */
    async initialize() {
        if (!this.votingEnabled) {
            console.log('[Voting] Voting module disabled in configuration');
            return;
        }

        try {
            // Connect to blockchain
            this.provider = new ethers.JsonRpcProvider(this.config.blockchainEndpoint);

            // Load wallet (if private key provided)
            if (this.config.voting?.privateKey) {
                this.wallet = new ethers.Wallet(this.config.voting.privateKey, this.provider);
            } else {
                console.warn('[Voting] No private key provided, voting disabled');
                this.votingEnabled = false;
                return;
            }

            // Load governance contract
            const governanceABI = require('./abi/OraSRSGovernance.json');
            this.governanceContract = new ethers.Contract(
                this.config.voting.governanceAddress,
                governanceABI,
                this.wallet
            );

            // Check qualification
            await this.checkQualification();

            if (this.isQualified) {
                console.log('[Voting] ✅ Node qualified for governance voting');
                // Start listening for new appeals
                this.startListening();
            } else {
                console.log('[Voting] ⚠️  Node not qualified for voting yet');
                console.log('[Voting] Requirements: Risk Score < 10, Uptime >= 72h, Reputation >= 60');
            }

        } catch (error) {
            console.error('[Voting] Failed to initialize:', error.message);
            this.votingEnabled = false;
        }
    }

    /**
     * Check if this node is qualified to vote
     */
    async checkQualification() {
        try {
            this.isQualified = await this.governanceContract.isNodeQualified(this.wallet.address);
            return this.isQualified;
        } catch (error) {
            console.error('[Voting] Failed to check qualification:', error.message);
            return false;
        }
    }

    /**
     * Start listening for new appeals
     */
    startListening() {
        console.log('[Voting] Listening for new appeals...');

        // Listen for AppealSubmitted events
        this.governanceContract.on('AppealSubmitted', async (appealID, appellant, targetIP, evidenceHash) => {
            console.log(`[Voting] New appeal detected: #${appealID} for IP ${targetIP}`);

            // Process appeal asynchronously
            setTimeout(() => this.processAppeal(appealID, targetIP, evidenceHash), 1000);
        });
    }

    /**
     * Process an appeal and cast a vote
     */
    async processAppeal(appealID, targetIP, evidenceHash) {
        try {
            // Check if already voted
            const hasVoted = await this.governanceContract.hasVoted(appealID, this.wallet.address);
            if (hasVoted) {
                console.log(`[Voting] Already voted on appeal #${appealID}`);
                return;
            }

            // Download evidence from IPFS (simplified - in production use actual IPFS)
            console.log(`[Voting] Downloading evidence: ${evidenceHash}`);
            const evidence = await this.downloadEvidence(evidenceHash);

            // Verify evidence
            const verdict = await this.verifyEvidence(targetIP, evidence);

            // Cast vote
            console.log(`[Voting] Casting vote on appeal #${appealID}: ${verdict ? 'SUPPORT' : 'REJECT'}`);
            const tx = await this.governanceContract.castVote(appealID, verdict);
            await tx.wait();

            console.log(`[Voting] ✅ Vote cast successfully on appeal #${appealID}`);

        } catch (error) {
            console.error(`[Voting] Failed to process appeal #${appealID}:`, error.message);
        }
    }

    /**
     * Download evidence from IPFS
     */
    async downloadEvidence(evidenceHash) {
        try {
            // In production, use actual IPFS gateway
            // For now, return mock evidence
            return {
                ipAddress: '1.2.3.4',
                logs: ['Sample log entry 1', 'Sample log entry 2'],
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[Voting] Failed to download evidence:', error.message);
            return null;
        }
    }

    /**
     * Verify evidence and determine vote
     */
    async verifyEvidence(targetIP, evidence) {
        if (!evidence) {
            return false;  // Reject if no evidence
        }

        try {
            // 1. Check log integrity
            const logsValid = this.checkLogIntegrity(evidence);
            if (!logsValid) {
                console.log(`[Voting] Evidence logs appear tampered, voting REJECT`);
                return false;
            }

            // 2. Check for obvious attack patterns
            const hasAttackPatterns = this.detectAttackPatterns(evidence);
            if (hasAttackPatterns) {
                console.log(`[Voting] Attack patterns detected in evidence, voting REJECT`);
                return false;
            }

            // 3. Query local threat database
            const localThreatData = await this.queryLocalThreats(targetIP);
            if (localThreatData && localThreatData.risk_score < 50) {
                console.log(`[Voting] Local data shows low risk, voting SUPPORT`);
                return true;
            }

            // Default: support if evidence looks legitimate
            console.log(`[Voting] Evidence appears legitimate, voting SUPPORT`);
            return true;

        } catch (error) {
            console.error('[Voting] Error verifying evidence:', error.message);
            return false;  // Reject on error
        }
    }

    /**
     * Check log integrity (simplified)
     */
    checkLogIntegrity(evidence) {
        // In production, verify signatures, timestamps, etc.
        return evidence && evidence.logs && evidence.logs.length > 0;
    }

    /**
     * Detect attack patterns in evidence
     */
    detectAttackPatterns(evidence) {
        if (!evidence || !evidence.logs) return false;

        const attackKeywords = ['SYN flood', 'brute force', 'SQL injection', 'XSS attack'];

        for (const log of evidence.logs) {
            for (const keyword of attackKeywords) {
                if (log.includes(keyword)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Query local threat database
     */
    async queryLocalThreats(ipAddress) {
        try {
            // Query local OraSRS client
            const response = await axios.get(`http://127.0.0.1:${this.config.port}/orasrs/v1/query?ip=${ipAddress}`);
            return response.data.response;
        } catch (error) {
            console.error('[Voting] Failed to query local threats:', error.message);
            return null;
        }
    }

    /**
     * Get voting statistics
     */
    async getStatistics() {
        if (!this.votingEnabled || !this.governanceContract) {
            return null;
        }

        try {
            const appealCount = await this.governanceContract.appealCount();

            return {
                qualified: this.isQualified,
                totalAppeals: appealCount.toString(),
                nodeAddress: this.wallet?.address || 'N/A'
            };
        } catch (error) {
            console.error('[Voting] Failed to get statistics:', error.message);
            return null;
        }
    }

    /**
     * Stop the voting module
     */
    stop() {
        if (this.governanceContract) {
            this.governanceContract.removeAllListeners();
        }
        console.log('[Voting] Voting module stopped');
    }
}

module.exports = VotingModule;
