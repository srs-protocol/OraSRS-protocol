/**
 * OraSRS Threat Intelligence Formatter
 * 威胁情报格式化工具
 */

import chalk from 'chalk';

class ThreatFormatter {
    /**
     * Format threat data in pretty Chinese-friendly format
     * 格式化威胁数据为中文友好格式
     */
    formatPretty(data) {
        const { query, response } = data;
        const ip = query.ip || query.domain || 'Unknown';

        let output = '';
        output += chalk.cyan(`🔍 查询 IP: ${ip}\n\n`);

        // Check if whitelisted
        const isWhitelisted = response.is_whitelisted || response.source === 'Local Whitelist';

        if (isWhitelisted) {
            output += chalk.green('✅ 白名单 IP\n\n');
            output += `  ${chalk.bold('白名单')}: ${chalk.green('是')}\n`;
            output += `  ${chalk.bold('数据来源')}: ${this.formatSource(response.source)}\n`;
            output += chalk.gray(`\n来源：${this.getBlockchainSource(response)}\n`);
            output += chalk.gray(`缓存：${response.cached || response.from_cache ? '是' : '否'}\n`);
        } else if (response.risk_score === 0 || response.risk_level === 'Safe' || response.risk_level === '安全') {
            output += chalk.green('✅ 安全 IP\n\n');
            output += `  ${chalk.bold('风险评分')}: ${chalk.green('0/100')}\n`;
            output += `  ${chalk.bold('风险等级')}: ${chalk.green('安全')}\n`;
            output += `  ${chalk.bold('数据来源')}: ${this.formatSource(response.source)}\n`;
            output += `  ${chalk.bold('白名单')}: ${chalk.gray('否')}\n`;
            output += chalk.gray(`\n来源：${this.getBlockchainSource(response)}\n`);
            output += chalk.gray(`缓存：${response.cached || response.from_cache ? '是' : '否'}\n`);
        } else {
            output += chalk.yellow('威胁情报:\n');
            output += `  ${chalk.bold('风险评分')}: ${this.formatRiskScore(response.risk_score)}\n`;
            output += `  ${chalk.bold('风险等级')}: ${this.formatRiskLevel(response.risk_level, response.risk_score)}\n`;

            // Calculate and display risk control period
            const riskControlPeriod = this.calculateRiskControlPeriod(response.risk_score);
            output += `  ${chalk.bold('建议风控')}: ${this.formatRiskControlPeriod(riskControlPeriod, response.risk_score)}\n`;

            const threatType = this.formatThreatType(response.threat_types, response.primary_threat_type);
            output += `  ${chalk.bold('威胁类型')}: ${threatType}\n`;

            output += `  ${chalk.bold('数据来源')}: ${this.formatSource(response.source)}\n`;

            if (response.first_seen) {
                output += `  ${chalk.bold('首次出现')}: ${this.formatDate(response.first_seen)}\n`;
            }

            if (response.last_seen) {
                const isActive = this.isActiveRecently(response.last_seen);
                output += `  ${chalk.bold('持续活跃')}: ${isActive ? chalk.red('Yes') : chalk.gray('No')}\n`;
            }

            output += `  ${chalk.bold('白名单')}: ${chalk.gray('否')}\n`;

            output += '\n';
            output += chalk.gray(`来源：${this.getBlockchainSource(response)}\n`);
            output += chalk.gray(`缓存：${response.cached || response.from_cache ? '是' : '否'}\n`);
        }

        output += '\n';
        output += chalk.yellow('📌 注意') + chalk.gray(': OraSRS 仅提供风险评估，是否阻断请结合业务策略决定。\n');

        return output;
    }

    /**
     * Calculate risk control period based on risk score
     * 根据风险评分计算建议风控时长
     */
    calculateRiskControlPeriod(score) {
        if (score >= 90) return '7天';
        if (score >= 80) return '3天';
        if (score >= 60) return '24小时';
        if (score >= 40) return '12小时';
        if (score >= 20) return '6小时';
        return '无需风控';
    }

    /**
     * Format risk control period with color
     */
    formatRiskControlPeriod(period, score) {
        if (score >= 80) return chalk.red(period);
        if (score >= 60) return chalk.yellow(period);
        if (score >= 40) return chalk.blue(period);
        return chalk.gray(period);
    }


    /**
     * Format risk score with color coding
     */
    formatRiskScore(score) {
        if (score === null || score === undefined) return chalk.gray('未知');

        const scoreStr = `${score}/100`;

        if (score >= 80) return chalk.red.bold(scoreStr);
        if (score >= 60) return chalk.red(scoreStr);
        if (score >= 40) return chalk.yellow(scoreStr);
        return chalk.green(scoreStr);
    }

    /**
     * Format risk level with color coding
     */
    formatRiskLevel(level, score) {
        // Translate to Chinese if needed
        const levelMap = {
            'Critical': '严重',
            'High': '高',
            'Medium': '中',
            'Low': '低',
            'Safe': '安全',
            'Unknown': '未知'
        };

        let chineseLevel = levelMap[level] || level;

        // If level not provided but score is, derive it
        if (!chineseLevel || chineseLevel === '未知') {
            if (score >= 80) chineseLevel = '严重';
            else if (score >= 60) chineseLevel = '高';
            else if (score >= 40) chineseLevel = '中';
            else if (score >= 20) chineseLevel = '低';
            else chineseLevel = '安全';
        }

        if (chineseLevel === '严重' || chineseLevel === 'Critical') return chalk.red.bold(chineseLevel);
        if (chineseLevel === '高' || chineseLevel === 'High') return chalk.red(chineseLevel);
        if (chineseLevel === '中' || chineseLevel === 'Medium') return chalk.yellow(chineseLevel);
        if (chineseLevel === '低' || chineseLevel === 'Low') return chalk.blue(chineseLevel);
        return chalk.green(chineseLevel);
    }

    /**
     * Format threat type
     */
    formatThreatType(threatTypes, primaryType) {
        if (threatTypes && threatTypes.length > 0) {
            return threatTypes.join(', ');
        }
        if (primaryType) {
            return primaryType;
        }
        return '未知';
    }

    /**
     * Format data source
     */
    formatSource(source) {
        if (!source) return '未知';

        const sourceMap = {
            'Local Cache': 'Local Cache (本地缓存)',
            'Blockchain': 'Blockchain (区块链)',
            'Local Whitelist': 'Local Whitelist (本地白名单)',
            'Abuse.ch': 'Abuse.ch Feodo Tracker',
            'Spamhaus': 'Spamhaus DROP',
            'DShield': 'DShield'
        };

        return sourceMap[source] || source;
    }

    /**
     * Get blockchain source name
     */
    getBlockchainSource(response) {
        if (response.source && response.source.includes('Blockchain')) {
            return '测试协议链';
        }
        if (response.cached) {
            return '测试协议链 (缓存)';
        }
        return '测试协议链';
    }

    /**
     * Format date to YYYY-MM-DD
     */
    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        } catch (e) {
            return dateStr;
        }
    }

    /**
     * Check if threat was active recently (within 7 days)
     */
    isActiveRecently(lastSeen) {
        try {
            const date = new Date(lastSeen);
            const now = new Date();
            const diffDays = (now - date) / (1000 * 60 * 60 * 24);
            return diffDays <= 7;
        } catch (e) {
            return false;
        }
    }

    /**
     * Format as JSON with pretty print
     */
    formatJSON(data) {
        return JSON.stringify(data, null, 2);
    }

    /**
     * Format threat list as table
     */
    formatTable(threatList) {
        if (!threatList || threatList.length === 0) {
            return chalk.gray('没有威胁数据\n');
        }

        let output = '';
        output += chalk.cyan.bold('威胁情报列表\n');
        output += chalk.gray('─'.repeat(80) + '\n');

        // Header
        output += chalk.bold(
            this.padRight('IP地址', 20) +
            this.padRight('风险等级', 12) +
            this.padRight('威胁类型', 20) +
            this.padRight('首次出现', 15) +
            '\n'
        );
        output += chalk.gray('─'.repeat(80) + '\n');

        // Rows
        for (const threat of threatList) {
            const ip = this.padRight(threat.ip || 'Unknown', 20);
            const level = this.padRight(threat.threat_level || threat.risk_level || 'Unknown', 12);
            const type = this.padRight(threat.primary_threat_type || 'Unknown', 20);
            const date = this.padRight(this.formatDate(threat.first_seen || threat.timestamp), 15);

            output += `${ip}${this.formatRiskLevel(level, threat.risk_score)}${' '.repeat(12 - level.length)}${type}${date}\n`;
        }

        output += chalk.gray('─'.repeat(80) + '\n');
        output += chalk.gray(`总计: ${threatList.length} 条威胁记录\n`);

        return output;
    }

    /**
     * Format sync status
     */
    formatSyncStatus(syncData) {
        let output = '';
        output += chalk.cyan('📊 缓存同步状态\n\n');

        if (syncData.success) {
            output += chalk.green('✅ 同步成功\n\n');

            if (syncData.stats) {
                output += chalk.bold('统计信息:\n');
                output += `  威胁数据: ${syncData.stats.threats || 0} 条\n`;
                output += `  安全IP: ${syncData.stats.safeIPs || 0} 个\n`;
                output += `  白名单: ${syncData.stats.whitelist || 0} 个\n`;
            }

            if (syncData.changes) {
                output += `\n${chalk.bold('变更:')}`;
                output += `  新增: ${chalk.green(syncData.changes.added || 0)}`;
                output += `  更新: ${chalk.yellow(syncData.changes.updated || 0)}`;
                output += `  删除: ${chalk.red(syncData.changes.removed || 0)}\n`;
            }

            if (syncData.lastSync) {
                output += `\n上次同步: ${chalk.gray(new Date(syncData.lastSync).toLocaleString('zh-CN'))}\n`;
            }
        } else {
            output += chalk.red('❌ 同步失败\n\n');
            if (syncData.message || syncData.error) {
                output += chalk.gray(`错误: ${syncData.message || syncData.error}\n`);
            }
        }

        return output;
    }

    /**
     * Format cache status
     */
    formatCacheStatus(cacheData) {
        let output = '';
        output += chalk.cyan('💾 本地缓存状态\n\n');

        output += chalk.bold('缓存统计:\n');
        output += `  威胁记录: ${chalk.yellow(cacheData.threats || 0)} 条\n`;
        output += `  安全IP: ${chalk.green(cacheData.safeIPs || 0)} 个\n`;
        output += `  白名单: ${chalk.blue(cacheData.whitelist || 0)} 个\n`;

        if (cacheData.lastUpdate) {
            output += `\n最后更新: ${chalk.gray(new Date(cacheData.lastUpdate).toLocaleString('zh-CN'))}\n`;
        }

        if (cacheData.syncStatus) {
            const status = cacheData.syncStatus;
            output += `\n同步状态: ${status.inProgress ? chalk.yellow('进行中') : chalk.green('就绪')}\n`;

            if (status.lastSync) {
                output += `上次同步: ${chalk.gray(new Date(status.lastSync).toLocaleString('zh-CN'))}\n`;
            }

            if (status.nextSync) {
                output += `下次同步: ${chalk.gray(new Date(status.nextSync).toLocaleString('zh-CN'))}\n`;
            }

            if (status.errors && status.errors.length > 0) {
                output += `\n${chalk.red('最近错误:')}\n`;
                status.errors.slice(-3).forEach(err => {
                    output += `  ${chalk.gray('• ' + err)}\n`;
                });
            }
        }

        return output;
    }

    /**
     * Pad string to specified width
     */
    padRight(str, width) {
        const strLen = str.replace(/\x1b\[[0-9;]*m/g, '').length; // Remove ANSI codes for length calc
        const padding = Math.max(0, width - strLen);
        return str + ' '.repeat(padding);
    }
}

export default ThreatFormatter;
