/**
 * Governance Committee Module for OraSRS
 * 实现治理委员会功能，包括提案管理、投票和决策流程
 */

class GovernanceCommittee {
  constructor(options = {}) {
    this.options = {
      maxMembers: options.maxMembers || 7,
      quorumRequired: options.quorumRequired || 4, // 最低投票人数
      proposalThreshold: options.proposalThreshold || 3, // 提案所需支持数
      votingPeriod: options.votingPeriod || 7 * 24 * 60 * 60 * 1000, // 7天投票期
      emergencyHaltThreshold: options.emergencyHaltThreshold || 5, // 紧急暂停阈值
      ...options
    };
    
    this.members = new Map();
    this.proposals = new Map();
    this.votes = new Map();
    
    // 初始化默认治理成员
    this.initializeDefaultMembers();
    
    console.log('Governance Committee module initialized');
  }

  /**
   * 初始化默认治理成员
   */
  initializeDefaultMembers() {
    // 模拟初始化7个治理席位：3企业 + 2高校 + 2社区
    const defaultMembers = [
      { id: 'member-enterprise-001', name: 'Tech Corp', type: 'enterprise', reputation: 95 },
      { id: 'member-enterprise-002', name: 'Security Inc', type: 'enterprise', reputation: 92 },
      { id: 'member-enterprise-003', name: 'Net Solutions', type: 'enterprise', reputation: 90 },
      { id: 'member-academia-001', name: 'Cybersecurity University', type: 'academia', reputation: 97 },
      { id: 'member-academia-002', name: 'Security Research Inst', type: 'academia', reputation: 94 },
      { id: 'member-community-001', name: 'Open Security Foundation', type: 'community', reputation: 89 },
      { id: 'member-community-002', name: 'Privacy Advocates', type: 'community', reputation: 91 }
    ];
    
    defaultMembers.forEach(member => {
      this.members.set(member.id, member);
    });
    
    console.log(`Initialized ${defaultMembers.length} governance committee members`);
  }

  /**
   * 添加治理委员会成员
   */
  addMember(memberId, memberInfo) {
    if (this.members.size >= this.options.maxMembers) {
      throw new Error(`Maximum committee size (${this.options.maxMembers}) reached`);
    }
    
    if (this.members.has(memberId)) {
      throw new Error(`Member with ID ${memberId} already exists`);
    }
    
    // 验证成员信息
    if (!this.validateMemberInfo(memberInfo)) {
      throw new Error('Invalid member information');
    }
    
    const member = {
      id: memberId,
      ...memberInfo,
      reputation: memberInfo.reputation || 75,
      joinDate: new Date().toISOString(),
      isActive: true
    };
    
    this.members.set(memberId, member);
    
    // 记录治理事件
    this.logGovernanceEvent('member_added', {
      memberId,
      memberInfo,
      addedBy: 'system'
    });
    
    return {
      success: true,
      message: `Member ${memberId} added to governance committee`,
      member
    };
  }

  /**
   * 验证成员信息
   */
  validateMemberInfo(memberInfo) {
    const requiredFields = ['name', 'type', 'contact'];
    const validTypes = ['enterprise', 'academia', 'community'];
    
    // 检查必需字段
    for (const field of requiredFields) {
      if (!memberInfo[field]) {
        return false;
      }
    }
    
    // 检查成员类型
    if (!validTypes.includes(memberInfo.type)) {
      return false;
    }
    
    // 检查声誉值范围
    if (memberInfo.reputation && (memberInfo.reputation < 0 || memberInfo.reputation > 100)) {
      return false;
    }
    
    return true;
  }

  /**
   * 创建治理提案
   */
  createProposal(proposalId, title, description, proposer, category) {
    if (this.proposals.has(proposalId)) {
      throw new Error(`Proposal with ID ${proposalId} already exists`);
    }
    
    if (!this.members.has(proposer)) {
      throw new Error(`Proposer ${proposer} is not a committee member`);
    }
    
    const validCategories = [
      'protocol_upgrade', 
      'security_policy', 
      'compliance', 
      'governance', 
      'emergency'
    ];
    
    if (!validCategories.includes(category)) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    const proposal = {
      id: proposalId,
      title,
      description,
      proposer,
      category,
      status: 'proposed',
      votes: {
        yes: 0,
        no: 0,
        abstain: 0
      },
      voting: {
        startedAt: null,
        endsAt: null,
        quorumReached: false
      },
      supporters: [proposer], // 提案者自动支持
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    this.proposals.set(proposalId, proposal);
    
    // 记录治理事件
    this.logGovernanceEvent('proposal_created', {
      proposalId,
      title,
      proposer,
      category
    });
    
    return {
      success: true,
      message: `Proposal ${proposalId} created successfully`,
      proposal
    };
  }

  /**
   * 开始提案投票
   */
  startVoting(proposalId) {
    const proposal = this.proposals.get(proposalId);
    
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} does not exist`);
    }
    
    if (proposal.status !== 'proposed') {
      throw new Error(`Proposal ${proposalId} is not in proposed status`);
    }
    
    // 检查是否满足提案阈值（至少3个支持者）
    if (proposal.supporters.length < this.options.proposalThreshold) {
      throw new Error(`Proposal does not meet threshold (${proposal.supporters.length}/${this.options.proposalThreshold})`);
    }
    
    // 设置投票时间
    const now = new Date();
    proposal.voting.startedAt = now.toISOString();
    proposal.voting.endsAt = new Date(now.getTime() + this.options.votingPeriod).toISOString();
    proposal.status = 'voting';
    proposal.updated_at = new Date().toISOString();
    
    // 记录治理事件
    this.logGovernanceEvent('voting_started', {
      proposalId,
      startedAt: proposal.voting.startedAt,
      endsAt: proposal.voting.endsAt
    });
    
    return {
      success: true,
      message: `Voting started for proposal ${proposalId}`,
      proposal
    };
  }

  /**
   * 委员会成员投票
   */
  vote(memberId, proposalId, voteChoice) {
    // 验证成员
    if (!this.members.has(memberId)) {
      throw new Error(`Member ${memberId} is not a committee member`);
    }
    
    const member = this.members.get(memberId);
    if (!member.isActive) {
      throw new Error(`Member ${memberId} is not active`);
    }
    
    // 验证提案
    if (!this.proposals.has(proposalId)) {
      throw new Error(`Proposal ${proposalId} does not exist`);
    }
    
    const proposal = this.proposals.get(proposalId);
    
    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting status`);
    }
    
    // 验证投票选项
    const validVotes = ['yes', 'no', 'abstain'];
    if (!validVotes.includes(voteChoice)) {
      throw new Error(`Invalid vote choice: ${voteChoice}`);
    }
    
    // 检查投票是否已过期
    if (new Date() > new Date(proposal.voting.endsAt)) {
      throw new Error(`Voting for proposal ${proposalId} has ended`);
    }
    
    // 记录投票
    const voteId = `${proposalId}_${memberId}`;
    const vote = {
      id: voteId,
      memberId,
      proposalId,
      choice: voteChoice,
      timestamp: new Date().toISOString(),
      memberReputation: member.reputation
    };
    
    this.votes.set(voteId, vote);
    
    // 更新提案计票
    proposal.votes[voteChoice]++;
    proposal.updated_at = new Date().toISOString();
    
    // 检查是否达到法定人数
    const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;
    proposal.voting.quorumReached = totalVotes >= this.options.quorumRequired;
    
    // 检查投票结果
    if (new Date() > new Date(proposal.voting.endsAt)) {
      this.finalizeProposal(proposalId);
    }
    
    // 记录治理事件
    this.logGovernanceEvent('vote_cast', {
      memberId,
      proposalId,
      voteChoice,
      timestamp: vote.timestamp
    });
    
    return {
      success: true,
      message: `Vote recorded for proposal ${proposalId}`,
      vote
    };
  }

  /**
   * 最终确定提案结果
   */
  finalizeProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    
    if (!proposal || proposal.status !== 'voting') {
      return;
    }
    
    // 计算结果
    const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;
    
    // 检查是否达到法定人数
    if (totalVotes < this.options.quorumRequired) {
      proposal.status = 'defeated';
      proposal.result = 'quorum_not_reached';
      proposal.reason = `Insufficient votes (${totalVotes}/${this.options.quorumRequired})`;
    } else {
      // 检查是否获得多数票
      const yesPercentage = proposal.votes.yes / totalVotes;
      if (yesPercentage > 0.5) {
        proposal.status = 'passed';
        proposal.result = 'majority_approved';
      } else {
        proposal.status = 'defeated';
        proposal.result = 'majority_not_obtained';
      }
    }
    
    proposal.updated_at = new Date().toISOString();
    
    // 记录治理事件
    this.logGovernanceEvent('proposal_finalized', {
      proposalId,
      status: proposal.status,
      result: proposal.result,
      votes: proposal.votes
    });
    
    return proposal;
  }

  /**
   * 紧急熔断
   */
  emergencyHalt(reason, initiator) {
    if (!this.members.has(initiator)) {
      throw new Error(`Initiator ${initiator} is not a committee member`);
    }
    
    // 检查发起人声誉
    const initiatorMember = this.members.get(initiator);
    if (initiatorMember.reputation < 80) {
      throw new Error(`Initiator ${initiator} does not have sufficient reputation`);
    }
    
    // 创建紧急提案
    const emergencyProposalId = `emergency_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const proposal = {
      id: emergencyProposalId,
      title: 'Emergency Protocol Halt',
      description: reason,
      proposer: initiator,
      category: 'emergency',
      status: 'passed', // 紧急提案立即通过
      votes: {
        yes: 0,
        no: 0,
        abstain: 0
      },
      voting: {
        startedAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        quorumReached: true
      },
      supporters: [initiator],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      result: 'emergency_approved',
      reason: 'Emergency halt procedure activated'
    };
    
    this.proposals.set(emergencyProposalId, proposal);
    
    // 记录治理事件
    this.logGovernanceEvent('emergency_halt', {
      reason,
      initiator,
      proposalId: emergencyProposalId
    });
    
    return {
      success: true,
      message: 'Emergency halt procedure activated',
      proposal
    };
  }

  /**
   * 获取治理委员会成员列表
   */
  getCommitteeMembers() {
    return Array.from(this.members.values());
  }

  /**
   * 获取提案列表
   */
  getProposals(status = null) {
    let proposals = Array.from(this.proposals.values());
    
    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }
    
    return proposals;
  }

  /**
   * 获取提案详情
   */
  getProposal(proposalId) {
    return this.proposals.get(proposalId);
  }

  /**
   * 获取投票详情
   */
  getVotesForProposal(proposalId) {
    const proposalVotes = Array.from(this.votes.values())
      .filter(vote => vote.proposalId === proposalId);
    
    return proposalVotes;
  }

  /**
   * 更新成员声誉
   */
  updateMemberReputation(memberId, newReputation) {
    if (!this.members.has(memberId)) {
      throw new Error(`Member ${memberId} does not exist`);
    }
    
    if (newReputation < 0 || newReputation > 100) {
      throw new Error('Reputation must be between 0 and 100');
    }
    
    const member = this.members.get(memberId);
    const oldReputation = member.reputation;
    member.reputation = newReputation;
    member.updated_at = new Date().toISOString();
    
    // 记录治理事件
    this.logGovernanceEvent('reputation_updated', {
      memberId,
      oldReputation,
      newReputation
    });
    
    return {
      success: true,
      message: `Reputation updated for member ${memberId}`,
      member
    };
  }

  /**
   * 记录治理事件
   */
  logGovernanceEvent(eventType, details) {
    const event = {
      id: `governance_event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      eventType,
      details,
      timestamp: new Date().toISOString()
    };
    
    // 在实际实现中，这里会将事件记录到治理日志
    console.log(`[GOVERNANCE] ${JSON.stringify(event)}`);
    
    return event;
  }

  /**
   * 获取治理报告
   */
  getGovernanceReport() {
    const totalMembers = this.members.size;
    const activeMembers = Array.from(this.members.values()).filter(m => m.isActive).length;
    const totalProposals = this.proposals.size;
    const activeProposals = Array.from(this.proposals.values()).filter(p => p.status === 'voting').length;
    const passedProposals = Array.from(this.proposals.values()).filter(p => p.status === 'passed').length;
    const defeatedProposals = Array.from(this.proposals.values()).filter(p => p.status === 'defeated').length;
    
    const report = {
      timestamp: new Date().toISOString(),
      committee: {
        totalMembers,
        activeMembers,
        composition: this.getCommitteeComposition()
      },
      proposals: {
        total: totalProposals,
        active: activeProposals,
        passed: passedProposals,
        defeated: defeatedProposals,
        successRate: totalProposals > 0 ? (passedProposals / totalProposals * 100).toFixed(2) + '%' : '0%'
      },
      governanceMetrics: {
        averageReputation: this.getAverageReputation(),
        votingParticipation: this.getVotingParticipation()
      },
      recentActivity: this.getRecentGovernanceActivity(10)
    };
    
    return report;
  }

  /**
   * 获取委员会构成
   */
  getCommitteeComposition() {
    const composition = {
      enterprise: 0,
      academia: 0,
      community: 0
    };
    
    for (const member of this.members.values()) {
      composition[member.type]++;
    }
    
    return composition;
  }

  /**
   * 获取平均声誉
   */
  getAverageReputation() {
    if (this.members.size === 0) return 0;
    
    const totalReputation = Array.from(this.members.values())
      .reduce((sum, member) => sum + member.reputation, 0);
    
    return totalReputation / this.members.size;
  }

  /**
   * 获取投票参与度
   */
  getVotingParticipation() {
    if (this.proposals.size === 0) return 0;
    
    const totalPossibleVotes = this.proposals.size * this.members.size;
    const totalActualVotes = this.votes.size;
    
    return totalPossibleVotes > 0 ? 
      (totalActualVotes / totalPossibleVotes * 100).toFixed(2) + '%' : 
      '0%';
  }

  /**
   * 获取近期治理活动
   */
  getRecentGovernanceActivity(limit = 10) {
    // 在实际实现中，这里会从治理日志中获取活动
    // 模拟返回最近的提案和投票
    const recentEvents = [];
    
    // 获取最近的提案
    const recentProposals = Array.from(this.proposals.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
    
    for (const proposal of recentProposals) {
      recentEvents.push({
        type: 'proposal',
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        timestamp: proposal.created_at
      });
    }
    
    // 获取最近的投票
    const recentVotes = Array.from(this.votes.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit - recentEvents.length);
    
    for (const vote of recentVotes) {
      recentEvents.push({
        type: 'vote',
        id: vote.id,
        proposalId: vote.proposalId,
        memberId: vote.memberId,
        choice: vote.choice,
        timestamp: vote.timestamp
      });
    }
    
    return recentEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
  }

  /**
   * 检查治理合规性
   */
  checkGovernanceCompliance() {
    const totalMembers = this.members.size;
    const enterpriseMembers = Array.from(this.members.values()).filter(m => m.type === 'enterprise').length;
    const academiaMembers = Array.from(this.members.values()).filter(m => m.type === 'academia').length;
    const communityMembers = Array.from(this.members.values()).filter(m => m.type === 'community').length;
    
    const compliance = {
      structureCompliance: {
        totalMembers: totalMembers === this.options.maxMembers,
        enterpriseRepresentation: enterpriseMembers >= 3,
        academiaRepresentation: academiaMembers >= 2,
        communityRepresentation: communityMembers >= 2
      },
      processCompliance: {
        votingThresholdRespected: this.options.quorumRequired <= this.options.maxMembers,
        proposalThresholdValid: this.options.proposalThreshold <= this.options.maxMembers,
        votingPeriodSet: this.options.votingPeriod > 0
      },
      status: 'compliant'
    };
    
    // 检查是否完全合规
    const isFullyCompliant = Object.values(compliance.structureCompliance).every(check => check) &&
                             Object.values(compliance.processCompliance).every(check => check);
    
    compliance.status = isFullyCompliant ? 'fully_compliant' : 'partially_compliant';
    
    return compliance;
  }

  /**
   * 模拟提案通过决策
   */
  simulateProposalDecision(proposalId) {
    const proposal = this.proposals.get(proposalId);
    
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} does not exist`);
    }
    
    // 模拟投票过程
    const allMembers = Array.from(this.members.values());
    
    // 随机投票
    for (const member of allMembers) {
      if (Math.random() > 0.3) { // 70%概率参与投票
        const voteChoice = ['yes', 'no', 'abstain'][Math.floor(Math.random() * 3)];
        try {
          this.vote(member.id, proposalId, voteChoice);
        } catch (e) {
          // 忽略错误（例如投票已结束）
        }
      }
    }
    
    // 强制完成投票
    this.finalizeProposal(proposalId);
    
    return {
      success: true,
      message: `Proposal ${proposalId} decision simulated`,
      proposal: this.proposals.get(proposalId)
    };
  }
}

module.exports = GovernanceCommittee;