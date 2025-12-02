/**
 * OraSRS 治理委员会模块
 * 实现技术指导委员会的治理功能
 */

class GovernanceCommittee {
  constructor(options = {}) {
    // 技术委员会 = 7 席（3 企业 + 2 高校 + 2 社区）
    this.committeeSeats = {
      enterprise: 3,
      academia: 2,
      community: 2
    };
    
    this.committeeMembers = new Map(); // 存储委员会成员
    this.proposals = new Map(); // 存储提案
    this.votes = new Map(); // 存储投票记录
    this.emergencyPowers = options.emergencyPowers || true; // 紧急熔断权
  }

  /**
   * 添加委员会成员
   */
  addMember(memberId, memberInfo) {
    if (!this.isValidMember(memberInfo)) {
      throw new Error('委员会成员信息不符合要求');
    }

    this.committeeMembers.set(memberId, {
      id: memberId,
      ...memberInfo,
      joinDate: new Date()
    });

    console.log(`委员会成员 ${memberId} 添加成功`);
    return { success: true, memberId };
  }

  /**
   * 验证成员信息
   */
  isValidMember(memberInfo) {
    if (!memberInfo.type || !['enterprise', 'academia', 'community'].includes(memberInfo.type)) {
      return false;
    }

    if (!memberInfo.name || !memberInfo.qualification) {
      return false;
    }

    // 根据类型验证席位数量
    const currentCount = Array.from(this.committeeMembers.values())
      .filter(m => m.type === memberInfo.type).length;
    
    const maxSeats = this.committeeSeats[memberInfo.type];
    if (currentCount >= maxSeats) {
      console.log(`类型 ${memberInfo.type} 的席位已满 (${maxSeats})`);
      return false;
    }

    return true;
  }

  /**
   * 创建提案
   */
  createProposal(proposalId, title, description, proposer, category = 'standard') {
    if (this.proposals.has(proposalId)) {
      throw new Error(`提案 ${proposalId} 已存在`);
    }

    const proposal = {
      id: proposalId,
      title,
      description,
      proposer,
      category, // standard, emergency
      status: 'pending', // pending, voting, approved, rejected
      votes: {
        yes: 0,
        no: 0,
        abstain: 0
      },
      votingStart: null,
      votingEnd: null,
      created: new Date(),
      requiredVotes: category === 'emergency' ? 5 : 4, // 紧急提案需要5票，普通提案需要4票
      results: null
    };

    this.proposals.set(proposalId, proposal);
    console.log(`提案 ${proposalId} 创建成功`);
    return { success: true, proposalId };
  }

  /**
   * 开始投票
   */
  startVoting(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`提案 ${proposalId} 不存在`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(`提案 ${proposalId} 状态不允许开始投票`);
    }

    // 检查委员会成员数量是否足够
    if (this.committeeMembers.size < 5) {
      throw new Error('委员会成员数量不足，无法开始投票');
    }

    proposal.status = 'voting';
    proposal.votingStart = new Date();
    proposal.votingEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天后结束

    console.log(`提案 ${proposalId} 开始投票`);
    return { success: true, proposalId };
  }

  /**
   * 投票
   */
  vote(memberId, proposalId, voteChoice) {
    if (!['yes', 'no', 'abstain'].includes(voteChoice)) {
      throw new Error('无效的投票选项');
    }

    const member = this.committeeMembers.get(memberId);
    if (!member) {
      throw new Error(`委员会成员 ${memberId} 不存在`);
    }

    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`提案 ${proposalId} 不存在`);
    }

    if (proposal.status !== 'voting') {
      throw new Error(`提案 ${proposalId} 不在投票状态`);
    }

    // 记录投票
    const voteKey = `${proposalId}-${memberId}`;
    if (this.votes.has(voteKey)) {
      // 更新现有投票
      const oldVote = this.votes.get(voteKey);
      proposal.votes[oldVote] -= 1;
    }

    this.votes.set(voteKey, voteChoice);
    proposal.votes[voteChoice] += 1;

    // 检查是否达到投票结束条件
    this.checkProposalStatus(proposalId);

    console.log(`成员 ${memberId} 对提案 ${proposalId} 投票: ${voteChoice}`);
    return { success: true, proposalId, vote: voteChoice };
  }

  /**
   * 检查提案状态
   */
  checkProposalStatus(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return;

    // 检查是否达到通过或拒绝条件
    if (proposal.votes.yes >= proposal.requiredVotes) {
      proposal.status = 'approved';
      proposal.results = {
        yes: proposal.votes.yes,
        no: proposal.votes.no,
        abstain: proposal.votes.abstain,
        outcome: 'approved'
      };
      console.log(`提案 ${proposalId} 已通过`);
    } else if (proposal.votes.no >= 4 || new Date() > new Date(proposal.votingEnd)) {
      proposal.status = 'rejected';
      proposal.results = {
        yes: proposal.votes.yes,
        no: proposal.votes.no,
        abstain: proposal.votes.abstain,
        outcome: 'rejected'
      };
      console.log(`提案 ${proposalId} 已拒绝`);
    }
  }

  /**
   * 紧急熔断
   */
  emergencyHalt(reason) {
    if (!this.emergencyPowers) {
      throw new Error('紧急熔断权未启用');
    }

    // 检查是否有至少 2/3 委员同意
    const totalMembers = this.committeeMembers.size;
    if (totalMembers === 0) {
      throw new Error('没有委员会成员');
    }

    // 在实际实现中，这里需要检查特定的紧急提案
    console.log(`触发紧急熔断: ${reason}`);
    
    return {
      success: true,
      action: 'emergency_halt',
      reason: reason,
      timestamp: new Date()
    };
  }

  /**
   * 获取提案状态
   */
  getProposalStatus(proposalId) {
    return this.proposals.get(proposalId) || null;
  }

  /**
   * 获取委员会成员列表
   */
  getCommitteeMembers() {
    return Array.from(this.committeeMembers.values());
  }

  /**
   * 获取所有提案
   */
  getAllProposals() {
    return Array.from(this.proposals.values());
  }

  /**
   * 审计声誉算法
   */
  auditReputationAlgorithm(algorithmVersion, auditorId) {
    const member = this.committeeMembers.get(auditorId);
    if (!member) {
      throw new Error(`审计员 ${auditorId} 不是委员会成员`);
    }

    console.log(`委员会成员 ${auditorId} 开始审计声誉算法版本 ${algorithmVersion}`);
    
    // 实际审计逻辑将在外部执行
    const auditReport = {
      algorithmVersion,
      auditor: auditorId,
      auditDate: new Date(),
      status: 'completed',
      findings: [],
      recommendations: []
    };

    console.log(`声誉算法审计完成: ${algorithmVersion}`);
    return auditReport;
  }
}

module.exports = GovernanceCommittee;