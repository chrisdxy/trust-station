"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Search, Filter, Plus, Eye, Edit, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare, Users, UserPlus, UserMinus, PauseCircle, Trash2, X, Loader2, ChevronRight, Briefcase, ChevronDown, FileText, FolderTree } from 'lucide-react';
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
  status: 'unassigned' | 'pending' | 'ongoing' | 'resolved' | 'archived';
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
  const [activeTab, setActiveTab] = useState<'mediator_types' | 'experts' | 'cases' | 'progress'>('mediator_types');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingExperts, setLoadingExperts] = useState(false);

  // 协调案件 - 从 API 加载
  const [cases, setCases] = useState<Case[]>([]);

  // 协调专家类型
  const [mediatorTypes, setMediatorTypes] = useState<{ id: string; name: string }[]>([]);
  const [editingType, setEditingType] = useState<{ id: string; name: string } | null>(null);
  const [newTypeName, setNewTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);

  // 从后台分类设置获取协调专家类型（profile 页共用）
  const adminCategories = useCategories();
  const expertTypeOptions = adminCategories.mediator_type?.map(c => c.name) || ['商业协调', '劳动协调', '合同协调'];

  // 协调专家列表 - 从 API 加载
  const [experts, setExperts] = useState<Mediator[]>([]);

  // 案件分配弹窗状态
  const [assigningCase, setAssigningCase] = useState<Case | null>(null);
  const [selectedExpert, setSelectedExpert] = useState('');
  const [expertSearchQuery, setExpertSearchQuery] = useState('');
  const [showCaseDetails, setShowCaseDetails] = useState(false);

  // 专家详情弹窗
  const [viewingExpert, setViewingExpert] = useState<Mediator | null>(null);

  // 从 API 加载数据
  useEffect(() => {
    loadCases();
    loadExperts();
    loadMediatorTypes();
  }, []);

  const loadMediatorTypes = async () => {
    try { const r = await fetch('/api/categories?type=mediator_type'); const d = await r.json(); if (d.success) setMediatorTypes(d.categories || []); } catch {}
  };
  const addMediatorType = async () => { if (!newTypeName.trim()) return; setSavingType(true); try { await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'mediator_type', name: newTypeName.trim() }) }); setNewTypeName(''); loadMediatorTypes(); } catch {} setSavingType(false); };
  const updateMediatorType = async () => { if (!editingType?.id || !editingType.name.trim()) return; setSavingType(true); try { await fetch('/api/categories', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingType) }); setEditingType(null); loadMediatorTypes(); } catch {} setSavingType(false); };
  const deleteMediatorType = async (id: string) => { if (!confirm('确定删除？')) return; try { await fetch('/api/categories?id=' + id, { method: 'DELETE' }); loadMediatorTypes(); } catch {} };

  const loadCases = async () => {
    setLoadingCases(true);
    try {
      const r = await fetch('/api/mediations?limit=100'); const d = await r.json();
      if (d.success) setCases((d.mediations || []).map((m: any) => ({
        id: m.id, title: m.title || '未命名', caseNumber: m.id?.slice(0, 8).toUpperCase(), type: m.dispute_type || 'coordination', description: m.description || '',
        status: m.status || 'unassigned', parties: [m.applicant_name, m.respondent_name].filter(Boolean),
        assignedTo: m.assigned_to || '', assignmentStatus: m.assignment_status || '', relationship: m.relationship || '',
        createdAt: m.created_at || '', applicationDate: m.created_at || '', priority: 'medium' as const
      })));
    } catch {} setLoadingCases(false);
  };

  const loadExperts = async () => {
    setLoadingExperts(true);
    try {
      const r = await fetch('/api/mediators'); const d = await r.json();
      if (d.success) setExperts((d.mediators || []).map((m: any) => ({
        id: m.id, name: m.name || (m.user_id || '').slice(0, 8), phone: m.phone || '', email: m.email || '', type: m.type || '',
        expertise: typeof m.expertise === 'string' ? JSON.parse(m.expertise) : (m.expertise || []),
        status: m.status || 'pending', caseCount: m.case_count || 0, successRate: m.success_rate || 0, registeredAt: m.created_at || '', description: m.description || ''
      })));
    } catch {} setLoadingExperts(false);
  };

  // 保存数据
  const saveCases = (data: Case[]) => { setCases(data); };
  const saveExperts = (data: Mediator[]) => { setExperts(data); };

  const statusColors: Record<string, string> = {
    unassigned: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  const statusLabels: Record<string, string> = {
    unassigned: '待分配', pending: '待调解', ongoing: '调解中', resolved: '调解结束', archived: '已存档',
    approved: '已认证', suspended: '已暂停', rejected: '已拒绝'
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };

  const filteredCases = cases.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.parties.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredExperts = experts.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const approvedExperts = experts.filter(e => e.status === 'approved');

  // 过滤可分配的专家（排除当事人）
  const filteredExpertsForAssign = approvedExperts.filter(expert =>
    expert.name.toLowerCase().includes(expertSearchQuery.toLowerCase()) &&
    (!assigningCase || !assigningCase.parties.some(p => expert.name === p))
  );

  // 分配案件
  const handleAssign = async () => {
    if (!assigningCase || !selectedExpert) return;
    const expert = experts.find(e => e.id === selectedExpert);
    if (!expert) return;
    saveCases(cases.map(c => c.id === assigningCase.id ? { ...c, assignedTo: expert.name, mediatorId: expert.id, status: 'pending' as const } : c));
    await fetch('/api/mediations', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: assigningCase.id, status: 'pending', assignedTo: expert.name }) }).catch(() => {});
    setAssigningCase(null); setSelectedExpert(''); setExpertSearchQuery('');
  };
  const handleApprove = async (expert: Mediator) => {
    await fetch('/api/mediators', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: expert.id, status: 'approved' }) }).catch(() => {});
    saveExperts(experts.map(e => e.id === expert.id ? { ...e, status: 'approved' as const } : e));
  };
  const handleReject = async (expert: Mediator) => {
    await fetch('/api/mediators', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: expert.id, status: 'rejected' }) }).catch(() => {});
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
                {activeTab === 'mediator_types' ? `共 ${mediatorTypes.length} 个协调专家类型` :
                 activeTab === 'experts' ? `共 ${experts.length} 位协调专家，其中 ${experts.filter(e => e.status === 'pending').length} 条待审核` :
                 activeTab === 'progress' ? `共 ${cases.filter(c => c.status === 'pending' || c.status === 'ongoing' || c.status === 'resolved').length} 件待调解/调解中/已结束` :
                 `共 ${cases.length} 条协调记录，其中 ${cases.filter(m => m.status === 'unassigned').length} 条待分配`
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Switch */}
        <div className="flex gap-4 mb-6">
          <button onClick={() => setActiveTab('mediator_types')} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'mediator_types' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <FolderTree className="w-4 h-4" />协调专家类型
          </button>
          <button onClick={() => setActiveTab('experts')} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'experts' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Users className="w-4 h-4" />协调专家管理
          </button>
          <button onClick={() => setActiveTab('cases')} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'cases' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Scale className="w-4 h-4" />协调案件分配
          </button>
          <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${activeTab === 'progress' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <Clock className="w-4 h-4" />协调案件进度
          </button>
        </div>

        {/* Filters - 类型管理页隐藏 */}
        {activeTab !== 'mediator_types' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'experts' ? "搜索专家姓名或邮箱..." : "搜索案件标题或当事人..."}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
              <option value="all">全部状态</option>
              {activeTab === 'experts' ? (<>
                <option value="pending">待审核</option><option value="approved">已认证</option>
                <option value="suspended">已暂停</option><option value="rejected">已拒绝</option>
              </>) : (<>
                <option value="unassigned">待分配</option><option value="pending">待调解</option>
                <option value="ongoing">调解中</option><option value="resolved">调解结束</option>
                <option value="archived">已存档</option>
              </>)}
            </select>
          </div>
        </motion.div>
        )}

        {/* Cases Tab */}
        {activeTab === 'cases' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: '待分配', count: cases.filter(m => m.status === 'unassigned').length, color: 'bg-slate-500', icon: Clock },
                { label: '待调解', count: cases.filter(m => m.status === 'pending').length, color: 'bg-amber-500', icon: AlertTriangle },
                { label: '调解中', count: cases.filter(m => m.status === 'ongoing').length, color: 'bg-blue-500', icon: Scale },
                { label: '调解结束', count: cases.filter(m => m.status === 'resolved').length, color: 'bg-green-500', icon: CheckCircle },
                { label: '已存档', count: cases.filter(m => m.status === 'archived').length, color: 'bg-purple-500', icon: FileText }
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
                    {filteredCases.map(c => (
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
                            {activeTab === ('cases' as any) && (!c.assignedTo || c.assignmentStatus === 'rejected') && c.status === 'unassigned' && (
                              <button onClick={() => setAssigningCase(c)} className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">分配</button>
                            )}
                            {activeTab === ('progress' as any) && c.status === 'pending' && (
                              <button onClick={async () => { await fetch('/api/mediations', { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id:c.id,status:'ongoing' }) }); saveCases(cases.map(x => x.id===c.id ? { ...x,status:'ongoing' }:x)); }}
                                className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">开始调解</button>
                            )}
                            {activeTab === ('progress' as any) && c.status === 'ongoing' && (
                              <button onClick={async () => { await fetch('/api/mediations', { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id:c.id,status:'resolved' }) }); saveCases(cases.map(x => x.id===c.id ? { ...x,status:'resolved' }:x)); }}
                                className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">结束调解</button>
                            )}
                            {activeTab === ('progress' as any) && c.status === 'resolved' && (
                              <button onClick={async () => { await fetch('/api/mediations', { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id:c.id,status:'archived' }) }); saveCases(cases.map(x => x.id===c.id ? { ...x,status:'archived' }:x)); }}
                                className="px-3 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">存档</button>
                            )}
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
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

        {/* Mediator Types Tab */}
        {activeTab === 'mediator_types' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">协调专家类型管理</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="输入新类型名称" className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
              <button onClick={addMediatorType} disabled={savingType || !newTypeName.trim()} className="px-4 py-2 bg-amber-500 text-white rounded-lg disabled:opacity-50"><Plus className="w-4 h-4" /></button>
            </div>
            {mediatorTypes.length === 0 ? <div className="text-center py-8 text-slate-400">暂无类型，请添加</div> : (
              <div className="space-y-2">
                {mediatorTypes.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    {editingType?.id === t.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="text" value={editingType.name} onChange={e => setEditingType({ ...editingType, name: e.target.value })} className="flex-1 px-3 py-1 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
                        <button onClick={updateMediatorType} disabled={savingType} className="px-3 py-1 bg-green-500 text-white rounded text-xs">保存</button>
                        <button onClick={() => setEditingType(null)} className="px-3 py-1 bg-slate-300 rounded text-xs">取消</button>
                      </div>) : (<>
                        <span className="text-slate-700 dark:text-slate-300">{t.name}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingType({ id: t.id, name: t.name })} className="p-1 text-slate-400 hover:text-amber-600"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => deleteMediatorType(t.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </>)}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">协调案件进度</h3>
            {(() => {
              const pc = filteredCases.filter(c => c.status === 'pending' || c.status === 'ongoing' || c.status === 'resolved');
              if (pc.length === 0) return <div className="text-center py-12 text-slate-500"><Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" /><p>暂无待调解或调解中的案件</p></div>;
              return (
                <div className="space-y-4">
                  {pc.map(c => (
                    <div key={c.id} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{c.title}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[c.status]}`}>{statusLabels[c.status]}</span>
                      </div>
                      <div className="text-sm text-slate-500 grid grid-cols-2 gap-2">
                        <span>当事人：{c.parties?.join('、') || '—'}</span>
                        <span>协调员：{c.assignedTo || '待分配'}</span>
                        <span>创建时间：{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</span>
                        <span>关联事项：{c.relationship || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
                { label: '已拒绝', count: experts.filter(e => e.status === 'rejected').length, color: 'bg-red-500' }
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
              {filteredExperts.map(expert => (
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
                      onChange={e => setExpertSearchQuery(e.target.value)}
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
                    {filteredExpertsForAssign.map(expert => (
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
