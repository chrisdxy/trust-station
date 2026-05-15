"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, Users, Clock, CheckCircle, XCircle, Plus, X, Loader2, AlertTriangle, User } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Mediation {
  id: string;
  title: string;
  status: string;
  applicant_id: string;
  applicant_name?: string;
  respondent_id: string;
  respondent_name?: string;
  third_party_id?: string;
  third_party_name?: string;
  mediator_id?: string;
  mediator_name?: string;
  relationship_id?: string;
  relationship_title?: string;
  reason: string;
  evidence?: string;
  expected_result?: string;
  resolution?: string;
  created_at?: string;
  updated_at?: string;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  pending: { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: '待处理' },
  processing: { icon: <Users className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: '处理中' },
  resolved: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: '已解决' },
  failed: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: '未解决' },
};

export default function MediationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [mediations, setMediations] = useState<Mediation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMediation, setSelectedMediation] = useState<Mediation | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    respondentId: '',
    respondentName: '',
    reason: '',
    evidence: '',
    expectedResult: '',
    relationshipId: '',
  });
  const [saving, setSaving] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // 记录搜索相关状态
  const [recordSearch, setRecordSearch] = useState('');
  const [recordResults, setRecordResults] = useState<any[]>([]);
  const [showRecordDropdown, setShowRecordDropdown] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // 被协调人相关状态
  const [recordParties, setRecordParties] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchMediations();
    }
  }, [user]);

  const fetchMediations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/mediations?userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setMediations(data.mediations || []);
      }
    } catch (error) {
      console.error('获取协调记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUser = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setSearchingUser(true);
    try {
      const response = await fetch(`/api/users?search=${encodeURIComponent(term)}`);
      const data = await response.json();
      let users = data.users || [];
      
      // 如果没有真实数据，使用本地模拟数据演示
      if (users.length === 0) {
        users = [
          { id: 'mock-1', phone: '13800001111', display_name: '张三', real_name: '张明', user_type: 'individual' },
          { id: 'mock-2', phone: '13900002222', display_name: '李四', real_name: '李华', user_type: 'expert' },
          { id: 'mock-3', phone: '13700003333', display_name: '王五', real_name: '王强', user_type: 'enterprise' },
        ].filter(u => 
          u.real_name?.includes(term) || 
          u.display_name?.includes(term) || 
          u.phone?.includes(term)
        );
      }
      
      setSearchResults(users);
      setShowDropdown(true);
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setSearchingUser(false);
    }
  };

  const selectUser = (u: any) => {
    setFormData(f => ({ ...f, respondentId: u.id, respondentName: u.real_name || u.display_name || '未命名' }));
    setShowDropdown(false);
    setSearchResults([]);
  };

  // 搜索我的认知留痕记录
  const searchRecords = async (term: string) => {
    if (!user?.id) return;
    setRecordSearch(term);
    if (!term.trim()) {
      setRecordResults([]);
      setShowRecordDropdown(false);
      return;
    }
    try {
      const response = await fetch(`/api/records?userId=${user.id}&search=${encodeURIComponent(term)}`);
      const data = await response.json();
      setRecordResults(data.records || []);
      setShowRecordDropdown(true);
    } catch (error) {
      console.error('搜索记录失败:', error);
      // 如果没有真实数据，使用模拟数据
      const mockRecords = [
        { id: 'r1', title: '项目A的认知记录', record_type: 'insight', user_name: '我' },
        { id: 'r2', title: '合作B的反思', record_type: 'reflection', user_name: '我' },
        { id: 'r3', title: '学习心得', record_type: 'learning', user_name: '我' },
      ].filter(r => r.title.includes(term));
      setRecordResults(mockRecords);
      setShowRecordDropdown(true);
    }
  };

  // 选择记录后获取相关方
  const selectRecord = (record: any) => {
    setSelectedRecord(record);
    setRecordSearch(record.title);
    setShowRecordDropdown(false);
    setRecordResults([]);
    setSelectedParty(null);
    setFormData(f => ({ ...f, respondentId: '', respondentName: '' }));
    
    // 获取记录的相关方（这里简化处理，实际需要从API获取）
    // 根据记录类型获取相关合作方
    fetchRecordParties(record.id);
  };

  // 获取记录相关的合作方
  const fetchRecordParties = async (recordId: string) => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/records/${recordId}/parties?userId=${user.id}`);
      const data = await response.json();
      if (data.success) {
        setRecordParties(data.parties || []);
      } else {
        // 模拟数据
        setRecordParties([
          { id: 'p1', name: '合作方A', role: 'partner' },
          { id: 'p2', name: '合作方B', role: 'partner' },
        ]);
      }
    } catch (error) {
      console.error('获取记录相关方失败:', error);
      setRecordParties([]);
    }
  };

  // 选择被协调人
  const selectParty = (party: any) => {
    setSelectedParty(party);
    setFormData(f => ({ ...f, respondentId: party.id, respondentName: party.name }));
  };

  // 清除记录选择
  const clearRecord = () => {
    setSelectedRecord(null);
    setRecordSearch('');
    setRecordParties([]);
    setSelectedParty(null);
    setFormData(f => ({ ...f, respondentId: '', respondentName: '' }));
  };

  const handleApply = async () => {
    if (!user?.id || !formData.title.trim() || !formData.respondentId) return;
    setSaving(true);
    try {
      const response = await fetch('/api/mediations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantId: user.id,
          title: formData.title,
          respondentId: formData.respondentId,
          reason: formData.reason,
          evidence: formData.evidence,
          expectedResult: formData.expectedResult,
          relationshipId: formData.relationshipId || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowApplyModal(false);
        setFormData({
          title: '',
          respondentId: '',
          respondentName: '',
          reason: '',
          evidence: '',
          expectedResult: '',
          relationshipId: '',
        });
        setSearchResults([]);
        setShowDropdown(false);
        fetchMediations();
      }
    } catch (error) {
      console.error('提交协调申请失败:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <Scale className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">请先登录</h2>
            <p className="text-slate-500">登录后可使用协调中心</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">协调中心</h1>
                <p className="text-white/80">公正调解，化纷止争</p>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                申请协调
              </button>
            </div>
          </div>
        </div>

        {/* 列表 */}
        <div className="max-w-7xl mx-auto px-4 py-8 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : mediations.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Scale className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无协调记录</p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="mt-4 text-orange-600 hover:text-orange-700"
              >
                点击发起第一次协调
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {mediations.map((mediation, index) => {
                const status = statusConfig[mediation.status] || statusConfig.pending;
                return (
                  <motion.div
                    key={mediation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedMediation(mediation);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                          <Scale className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {mediation.title}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              申请方: {mediation.applicant_name || '未知'}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              被协调方: {mediation.respondent_name || '未知'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {mediation.reason}
                          </p>
                        </div>
                      </div>
                      {mediation.created_at && (
                        <span className="text-sm text-slate-400">
                          {new Date(mediation.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 申请弹窗 */}
        <AnimatePresence>
          {showApplyModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => { setShowApplyModal(false); setRecordSearch(''); setRecordResults([]); setSelectedRecord(null); setRecordParties([]); setSelectedParty(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">申请协调</h3>
                  <button onClick={() => { setShowApplyModal(false); setRecordSearch(''); setRecordResults([]); setSelectedRecord(null); setRecordParties([]); setSelectedParty(null); }}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      协调标题 *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="简要描述协调事项"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      被协调人 <span className="text-red-500">*</span>
                    </label>
                    
                    {/* 步骤1: 搜索我的记录 */}
                    <div className="mb-3">
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        第一步: 选择记录事项
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="recordSearch"
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                          placeholder="搜索我的认知留痕记录..."
                          value={recordSearch}
                          onChange={(e) => searchRecords(e.target.value)}
                          onFocus={() => { if (recordResults.length > 0) setShowRecordDropdown(true); }}
                        />
                        {selectedRecord && (
                          <button 
                            type="button"
                            onClick={clearRecord}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {showRecordDropdown && recordResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {recordResults.map((r: any) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => selectRecord(r)}
                                className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{r.title}</span>
                                  <span className="text-xs text-slate-400">
                                    {r.record_type === 'insight' ? '认知' : r.record_type === 'reflection' ? '反思' : r.record_type === 'learning' ? '学习' : '成就'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 步骤2: 选择被协调人 */}
                    {selectedRecord && (
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                          第二步: 点选被协调人
                        </label>
                        {recordParties.length > 0 ? (
                          <div className="space-y-2">
                            {recordParties.map(party => (
                              <button
                                key={party.id}
                                type="button"
                                onClick={() => selectParty(party)}
                                className={`w-full px-4 py-3 text-left rounded-lg border transition-colors ${
                                  selectedParty?.id === party.id
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                                    : 'border-slate-200 dark:border-slate-600 hover:border-orange-300'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    selectedParty?.id === party.id
                                      ? 'border-orange-500 bg-orange-500'
                                      : 'border-slate-300'
                                  }`}>
                                    {selectedParty?.id === party.id && (
                                      <div className="w-2 h-2 rounded-full bg-white" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-slate-900 dark:text-white">
                                      {party.name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {party.role === 'partner' ? '合作方' : party.role === 'community' ? '共同体成员' : '其他'}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 py-2">该记录暂无关联的合作方</div>
                        )}
                      </div>
                    )}
                    
                    {selectedParty && (
                      <p className="text-sm text-green-600 mt-2">已选择被协调人: {selectedParty.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      协调原因 *
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(f => ({ ...f, reason: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={3}
                      placeholder="详细描述协调原因..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      相关证据
                    </label>
                    <textarea
                      value={formData.evidence}
                      onChange={(e) => setFormData(f => ({ ...f, evidence: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={2}
                      placeholder="列出相关证据..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      期望结果
                    </label>
                    <textarea
                      value={formData.expectedResult}
                      onChange={(e) => setFormData(f => ({ ...f, expectedResult: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={2}
                      placeholder="期望的协调结果..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowApplyModal(false)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={saving || !formData.title.trim() || !formData.respondentId}
                      className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? '提交中...' : '提交申请'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 详情弹窗 */}
        <AnimatePresence>
          {showDetailModal && selectedMediation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Scale className="w-6 h-6 text-orange-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedMediation.title}
                    </h3>
                  </div>
                  <button onClick={() => setShowDetailModal(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedMediation.status]?.bg} ${statusConfig[selectedMediation.status]?.color}`}>
                    {statusConfig[selectedMediation.status]?.icon}
                    {statusConfig[selectedMediation.status]?.label}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <p className="text-sm text-slate-500 mb-1">申请方</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedMediation.applicant_name || '未知'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <p className="text-sm text-slate-500 mb-1">被协调方</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedMediation.respondent_name || '未知'}
                      </p>
                    </div>
                  </div>

                  {selectedMediation.mediator_name && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <p className="text-sm text-slate-500 mb-1">协调员</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedMediation.mediator_name}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-slate-500 mb-1">协调原因</p>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {selectedMediation.reason}
                    </p>
                  </div>

                  {selectedMediation.evidence && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">相关证据</p>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedMediation.evidence}
                      </p>
                    </div>
                  )}

                  {selectedMediation.expected_result && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">期望结果</p>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedMediation.expected_result}
                      </p>
                    </div>
                  )}

                  {selectedMediation.resolution && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-600 mb-1 font-medium">协调结果</p>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {selectedMediation.resolution}
                      </p>
                    </div>
                  )}

                  {selectedMediation.created_at && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                      提交时间: {new Date(selectedMediation.created_at).toLocaleString('zh-CN')}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
