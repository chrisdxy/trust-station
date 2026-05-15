"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Search, Filter, Plus, Eye, Edit, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare, Users, UserPlus, UserMinus, PauseCircle, Trash2, X, Loader2, ChevronRight, Briefcase, ChevronDown, FileText } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { useCategories } from '@/hooks/useCategories';

interface Mediator {
  id: string;
  name: string;
  avatar?: string;
  phone: string;
  email: string;
  type: string; // 协调专家类型
  expertise: string[]; // 擅长领域
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  caseCount: number;
  successRate: number;
  registeredAt: string;
  description?: string;
}

interface Case {
  id: string;
  title: string;
  caseNumber?: string;
  type?: string;
  amount?: string;
  description?: string;
  status: 'pending' | 'ongoing' | 'resolved' | 'failed';
  parties: string[];
  mediator?: string;
  mediatorId?: string;
  relationship: string;
  createdAt: string;
  applicationDate?: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
  assignmentStatus?: 'pending' | 'accepted' | 'rejected';
  assignmentNote?: string;
  assignmentDate?: string;
}

export default function MediationPage() {
  const [activeTab, setActiveTab] = useState<'cases' | 'experts'>('cases');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 协调案件
  const [cases, setCases] = useState<Case[]>([
    { id: '1', title: '合同执行争议', caseNumber: 'MED-2024-001', type: '合同纠纷', amount: '¥50,000', description: '甲方未按合同约定时间交付货物，导致项目延期造成损失', status: 'pending', parties: ['张明', '李华'], mediator: '待分配', relationship: '项目合作协议', createdAt: '2024-03-15', applicationDate: '2024-03-15', priority: 'high' },
    { id: '2', title: '款项支付纠纷', caseNumber: 'MED-2024-002', type: '债务纠纷', amount: '¥120,000', description: '乙方完成项目后，甲方拖延支付尾款，经多次催收未果', status: 'ongoing', parties: ['王芳', '刘强'], mediator: '王协调员', mediatorId: '2', assignedTo: '王协调员', assignmentStatus: 'accepted', assignmentDate: '2024-03-12', relationship: '投资协议', createdAt: '2024-03-10', applicationDate: '2024-03-10', priority: 'medium' },
    { id: '3', title: '分成比例争议', caseNumber: 'MED-2024-003', type: '合作纠纷', amount: '¥80,000', description: '合作项目收益分配存在分歧，双方对分成比例理解不同', status: 'resolved', parties: ['赵六', '钱七'], mediator: '李协调员', mediatorId: '3', relationship: '合伙协议', createdAt: '2024-02-28', applicationDate: '2024-02-28', priority: 'low' },
    { id: '4', title: '违约金追讨', caseNumber: 'MED-2024-004', type: '违约纠纷', amount: '¥200,000', description: '一方违约需支付违约金，另一方拒绝履行赔偿义务', status: 'failed', parties: ['孙八', '周九'], mediator: '张协调员', mediatorId: '1', relationship: '服务合同', createdAt: '2024-02-15', applicationDate: '2024-02-15', priority: 'high' },
    { id: '5', title: '技术方案争议', caseNumber: 'MED-2024-005', type: '技术纠纷', amount: '¥35,000', description: '技术方案交付标准存在争议，双方理解不一致', status: 'pending', parties: ['吴十', '郑十一'], mediator: '待分配', relationship: '技术开发合同', createdAt: '2024-03-18', applicationDate: '2024-03-18', priority: 'medium', assignedTo: '王协调员', assignmentStatus: 'pending', assignmentDate: '2024-03-19' },
  ]);

  // 从后台分类设置获取协调专家类型
  const adminCategories = useCategories();
  const expertTypes = adminCategories.community?.map(c => c.name) || ['商业协调', '劳动协调', '合同协调', '知识产权协调'];

  // 协调专家列表
  const [experts, setExperts] = useState<Mediator[]>([
    { id: '1', name: '王协调员', phone: '138****1234', email: 'wang@zhengdao.com', type: '商业协调', expertise: ['合同纠纷', '投资争议'], status: 'approved', caseCount: 25, successRate: 92, registeredAt: '2024-01-15', description: '资深商业协调专家，10年经验' },
    { id: '2', name: '李协调员', phone: '139****5678', email: 'li@zhengdao.com', type: '劳动协调', expertise: ['劳动争议', '薪酬纠纷'], status: 'approved', caseCount: 18, successRate: 88, registeredAt: '2024-02-01', description: '专注劳动争议协调' },
    { id: '3', name: '张协调员', phone: '137****9012', email: 'zhang@zhengdao.com', type: '合同协调', expertise: ['合同执行', '违约责任'], status: 'approved', caseCount: 12, successRate: 85, registeredAt: '2024-02-10', description: '合同法专业背景' },
    { id: '4', name: '赵申请', phone: '136****3456', email: 'zhao@zhengdao.com', type: '商业协调', expertise: ['商务合作'], status: 'pending', caseCount: 0, successRate: 0, registeredAt: '2024-03-18', description: '商务律师转型协调' },
    { id: '5', name: '钱申请', phone: '135****7890', email: 'qian@zhengdao.com', type: '知识产权协调', expertise: ['专利纠纷', '商标争议'], status: 'suspended', caseCount: 5, successRate: 60, registeredAt: '2024-01-20', description: '知识产权专家' },
  ]);

  // 案件分配弹窗状态
  const [assigningCase, setAssigningCase] = useState<Case | null>(null);
  const [selectedExpert, setSelectedExpert] = useState('');
  const [expertSearchQuery, setExpertSearchQuery] = useState('');
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  // 专家详情弹窗
  const [viewingExpert, setViewingExpert] = useState<Mediator | null>(null);

  // 加载保存的数据
  useEffect(() => {
    const savedCases = localStorage.getItem('admin_mediation_cases');
    const savedExperts = localStorage.getItem('admin_mediation_experts');
    if (savedCases) {
      try {
        setCases(JSON.parse(savedCases));
      } catch (e) {}
    }
    if (savedExperts) {
      try {
        setExperts(JSON.parse(savedExperts));
      } catch (e) {}
    }
  }, []);

  // 保存数据
  const saveCases = (data: Case[]) => {
    setCases(data);
    localStorage.setItem('admin_mediation_cases', JSON.stringify(data));
  };

  const saveExperts = (data: Mediator[]) => {
    setExperts(data);
    localStorage.setItem('admin_mediation_experts', JSON.stringify(data));
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    ongoing: '协调中',
    resolved: '已解决',
    failed: '协调失败',
    approved: '已认证',
    suspended: '已暂停',
    rejected: '已拒绝',
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const filteredCases = cases.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.parties.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredExperts = experts.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const approvedExperts = experts.filter(e => e.status === 'approved');

  // 过滤可分配的专家
  const filteredExpertsForAssign = approvedExperts.filter(expert =>
    expert.name.toLowerCase().includes(expertSearchQuery.toLowerCase())
  );

  // 分配案件
  const handleAssign = () => {
    if (!assigningCase || !selectedExpert) return;
    const expert = experts.find(e => e.id === selectedExpert);
    if (!expert) return;

    saveCases(cases.map(c => 
      c.id === assigningCase.id 
        ? { ...c, mediator: expert.name, mediatorId: expert.id, status: 'ongoing' as const }
        : c
    ));
    setAssigningCase(null);
    setSelectedExpert('');
    setExpertSearchQuery('');
  };

  // 审批专家
  const handleApprove = (expert: Mediator) => {
    saveExperts(experts.map(e => e.id === expert.id ? { ...e, status: 'approved' as const } : e));
  };

  // 拒绝专家
  const handleReject = (expert: Mediator) => {
    saveExperts(experts.map(e => e.id === expert.id ? { ...e, status: 'rejected' as const } : e));
  };

  // 暂停资格
  const handleSuspend = (expert: Mediator) => {
    saveExperts(experts.map(e => e.id === expert.id ? { ...e, status: 'suspended' as const } : e));
  };

  // 恢复资格
  const handleRestore = (expert: Mediator) => {
    saveExperts(experts.map(e => e.id === expert.id ? { ...e, status: 'approved' as const } : e));
  };

  // 删除专家
  const handleDelete = (expert: Mediator) => {
    saveExperts(experts.filter(e => e.id !== expert.id));
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                协调管理
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === 'cases' 
                  ? `共 ${cases.length} 条协调记录，其中 ${cases.filter(m => m.status === 'pending').length} 条待分配`
                  : `共 ${experts.length} 位协调专家，其中 ${experts.filter(e => e.status === 'pending').length} 条待审核`
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Switch */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'cases'
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            协调案件分配
          </button>
          <button
            onClick={() => setActiveTab('experts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'experts'
                ? 'bg-amber-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            协调专家管理
          </button>
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'cases' ? "搜索案件标题或当事人..." : "搜索专家姓名或邮箱..."}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="all">全部状态</option>
              {activeTab === 'cases' ? (
                <>
                  <option value="pending">待处理</option>
                  <option value="ongoing">协调中</option>
                  <option value="resolved">已解决</option>
                  <option value="failed">协调失败</option>
                </>
              ) : (
                <>
                  <option value="pending">待审核</option>
                  <option value="approved">已认证</option>
                  <option value="suspended">已暂停</option>
                  <option value="rejected">已拒绝</option>
                </>
              )}
            </select>
          </div>
        </motion.div>

        {/* Cases Tab */}
        {activeTab === 'cases' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '待处理', count: cases.filter(m => m.status === 'pending').length, color: 'bg-amber-500', icon: Clock },
                { label: '协调中', count: cases.filter(m => m.status === 'ongoing').length, color: 'bg-blue-500', icon: Scale },
                { label: '已解决', count: cases.filter(m => m.status === 'resolved').length, color: 'bg-green-500', icon: CheckCircle },
                { label: '协调失败', count: cases.filter(m => m.status === 'failed').length, color: 'bg-red-500', icon: XCircle },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.count}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Cases List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">案件</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">当事人</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">协调员</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">优先级</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">状态</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredCases.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900 dark:text-white">{c.title}</p>
                          <p className="text-xs text-slate-500">{c.relationship}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {c.parties.join(' / ')}
                        </td>
                        <td className="px-4 py-3">
                          {c.assignedTo ? (
                            <div>
                              <span className="text-sm text-slate-600 dark:text-slate-400">{c.assignedTo}</span>
                              {c.assignmentStatus && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                  c.assignmentStatus === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  c.assignmentStatus === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  {c.assignmentStatus === 'pending' ? '待接收' : c.assignmentStatus === 'accepted' ? '已接收' : '已拒绝'}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 text-sm">待分配</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[c.priority]}`}>
                            {c.priority === 'high' ? '高' : c.priority === 'medium' ? '中' : '低'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[c.status]}`}>
                            {statusLabels[c.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{c.createdAt}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {(!c.assignedTo || c.assignmentStatus === 'rejected') && c.status === 'pending' && (
                              <button
                                onClick={() => setAssigningCase(c)}
                                className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                              >
                                分配
                              </button>
                            )}
                            {c.assignedTo && c.assignmentStatus === 'pending' && (
                              <span className="px-2 py-1 text-xs bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 rounded">
                                待确认
                              </span>
                            )}
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredCases.length === 0 && (
                <div className="text-center py-12">
                  <Scale className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">暂无协调案件</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Experts Tab */}
        {activeTab === 'experts' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '待审核', count: experts.filter(e => e.status === 'pending').length, color: 'bg-amber-500' },
                { label: '已认证', count: experts.filter(e => e.status === 'approved').length, color: 'bg-green-500' },
                { label: '已暂停', count: experts.filter(e => e.status === 'suspended').length, color: 'bg-orange-500' },
                { label: '已拒绝', count: experts.filter(e => e.status === 'rejected').length, color: 'bg-red-500' },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                      {stat.label === '待审核' && <Clock className="w-5 h-5 text-white" />}
                      {stat.label === '已认证' && <CheckCircle className="w-5 h-5 text-white" />}
                      {stat.label === '已暂停' && <PauseCircle className="w-5 h-5 text-white" />}
                      {stat.label === '已拒绝' && <XCircle className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.count}</p>
                      <p className="text-sm text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Experts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExperts.map((expert) => (
                <motion.div
                  key={expert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg font-medium">{expert.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{expert.name}</p>
                        <p className="text-sm text-slate-500">{expert.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[expert.status]}`}>
                      {statusLabels[expert.status]}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">{expert.description}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {expert.expertise.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="text-slate-500">
                      <span className="text-slate-400">案件数：</span>
                      <span className="text-slate-900 dark:text-white">{expert.caseCount}</span>
                    </div>
                    <div className="text-slate-500">
                      <span className="text-slate-400">成功率：</span>
                      <span className="text-green-600">{expert.successRate}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => setViewingExpert(expert)}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      详情
                    </button>
                    
                    {expert.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(expert)}
                          className="flex-1 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          审批通过
                        </button>
                        <button
                          onClick={() => handleReject(expert)}
                          className="flex-1 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          拒绝
                        </button>
                      </>
                    )}

                    {expert.status === 'approved' && (
                      <>
                        <button
                          onClick={() => handleSuspend(expert)}
                          className="flex-1 px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                        >
                          暂停资格
                        </button>
                        <button
                          onClick={() => handleDelete(expert)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {expert.status === 'suspended' && (
                      <>
                        <button
                          onClick={() => handleRestore(expert)}
                          className="flex-1 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                          恢复资格
                        </button>
                        <button
                          onClick={() => handleDelete(expert)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredExperts.length === 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">暂无协调专家</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* 分配案件弹窗 */}
      <AnimatePresence>
        {assigningCase && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">分配协调员</h2>
                <button onClick={() => setAssigningCase(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6">
                {/* 案件情况查看 */}
                <div className="mb-6">
                  <button 
                    onClick={() => setShowCaseDetails(!showCaseDetails)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-amber-500" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900 dark:text-white">{assigningCase.title}</p>
                        <p className="text-sm text-slate-500">点击查看案件详情</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showCaseDetails ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* 案件详情展开 */}
                  {showCaseDetails && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">案件编号</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{assigningCase.caseNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">案件类型</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{assigningCase.type || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">申请时间</p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{assigningCase.applicationDate || assigningCase.createdAt}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">涉案金额</p>
                          <p className="text-sm font-medium text-amber-600">{assigningCase.amount || '—'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">当事人</p>
                        <p className="text-sm text-slate-900 dark:text-slate-300">{assigningCase.parties.join(' / ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">争议摘要</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{assigningCase.description || '—'}</p>
                      </div>
                      {/* 分配跟进情况 */}
                      {assigningCase.assignedTo && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-600">
                          <p className="text-xs text-slate-500 mb-2">分配跟进情况</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assigningCase.assignmentStatus === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              assigningCase.assignmentStatus === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                              {assigningCase.assignmentStatus === 'pending' ? '待接收' : assigningCase.assignmentStatus === 'accepted' ? '已接收' : '已拒绝'}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{assigningCase.assignedTo}</span>
                          </div>
                          {assigningCase.assignmentDate && (
                            <p className="text-xs text-slate-500">分配时间：{assigningCase.assignmentDate}</p>
                          )}
                          {assigningCase.assignmentNote && (
                            <p className="text-xs text-slate-500 mt-1">备注：{assigningCase.assignmentNote}</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 搜索协调专家 */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={expertSearchQuery}
                      onChange={(e) => setExpertSearchQuery(e.target.value)}
                      placeholder="搜索协调专家姓名..."
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    选择协调专家 {approvedExperts.length > 0 && `(${filteredExpertsForAssign.length} 位可选)`}
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredExpertsForAssign.map((expert) => (
                      <button
                        key={expert.id}
                        onClick={() => setSelectedExpert(expert.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          selectedExpert === expert.id
                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">{expert.name[0]}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">{expert.name}</p>
                            <p className="text-xs text-slate-500">{expert.type} · {expert.successRate}%成功率</p>
                          </div>
                          {selectedExpert === expert.id && (
                            <CheckCircle className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredExpertsForAssign.length === 0 && expertSearchQuery && (
                      <p className="text-center text-slate-500 py-4">未找到匹配的协调专家</p>
                    )}
                    {!expertSearchQuery && approvedExperts.length === 0 && (
                      <p className="text-center text-slate-500 py-4">暂无可分配的协调专家</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setAssigningCase(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  关闭
                </button>
                {(!assigningCase.assignedTo || assigningCase.assignmentStatus === 'rejected') && (
                  <button
                    onClick={handleAssign}
                    disabled={!selectedExpert}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                  >
                    确认分配
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 专家详情弹窗 */}
      <AnimatePresence>
        {viewingExpert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">协调专家详情</h2>
                <button onClick={() => setViewingExpert(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-medium">{viewingExpert.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{viewingExpert.name}</h3>
                    <p className="text-slate-500">{viewingExpert.type}</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[viewingExpert.status]}`}>
                      {statusLabels[viewingExpert.status]}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">联系电话</span>
                    <span className="text-slate-900 dark:text-white">{viewingExpert.phone}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">电子邮箱</span>
                    <span className="text-slate-900 dark:text-white">{viewingExpert.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">擅长领域</span>
                    <span className="text-slate-900 dark:text-white">{viewingExpert.expertise.join('、')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">协调案件数</span>
                    <span className="text-slate-900 dark:text-white">{viewingExpert.caseCount}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">协调成功率</span>
                    <span className="text-green-600 font-medium">{viewingExpert.successRate}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-500">注册时间</span>
                    <span className="text-slate-900 dark:text-white">{viewingExpert.registeredAt}</span>
                  </div>
                  {viewingExpert.description && (
                    <div className="py-2">
                      <span className="text-slate-500 block mb-2">个人简介</span>
                      <p className="text-slate-900 dark:text-white">{viewingExpert.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
