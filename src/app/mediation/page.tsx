"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, Users, Clock, CheckCircle, XCircle, Plus, X, Loader2, AlertTriangle, User, Image, Upload, Search } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';

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
  unassigned: { icon: <Clock className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-900/30', label: '待分配' },
  pending: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: '待调解' },
  ongoing: { icon: <Users className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: '调解中' },
  resolved: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: '调解结束' },
  archived: { icon: <FileText className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', label: '已存档' }
};

export default function MediationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [mediations, setMediations] = useState<Mediation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<'applicant' | 'respondent'>('applicant');
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
    relationshipId: ''
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [createdMediationId, setCreatedMediationId] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // 记录搜索相关状态
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  
  // 被协调人相关
  const [selectedRespondent, setSelectedRespondent] = useState<UserSearchResult[]>([]);

  // 证据文件
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 记录搜索
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  const [recordSearchResults, setRecordSearchResults] = useState<any[]>([]);
  const [showRecordDropdown, setShowRecordDropdown] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMediations();
    }
  }, [user, activeRole]);

  const fetchMediations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('userId', user.id);
      params.set('role', activeRole);
      const response = await fetch(`/api/mediations?${params}`);
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
          { id: 'mock-3', phone: '13700003333', display_name: '王五', real_name: '王强', user_type: 'enterprise' }
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

  // 搜索认知留痕记录（按ID或标题关键字，不限类型）
  const searchRecords = async (term: string) => {
    setRecordSearchTerm(term);
    if (!term.trim()) { setRecordSearchResults([]); setShowRecordDropdown(false); return; }
    try {
      // 尝试按完整 ID 或关键字搜索
      const searchId = term.trim().toUpperCase().startsWith('RCD') 
        ? term.trim().slice(3).toLowerCase() // RCDA6BE107D → a6be107d
        : term.trim();
      const res = await fetch(`/api/records?userId=${user?.id}&keyword=${encodeURIComponent(searchId)}`);
      const data = await res.json();
      if (data.success) {
        // 不限类型，所有记录均可作为协调事项
        setRecordSearchResults(data.records || []);
        setShowRecordDropdown((data.records || []).length > 0);
      }
    } catch { setRecordSearchResults([]); }
  };

  const selectRecord = (record: any) => {
    setSelectedRecord(record);
    setRecordSearchTerm(record.title || '');
    setShowRecordDropdown(false);
    setRecordSearchResults([]);
    // 自动生成协调标题：避免"关于"嵌套
    const recTitle = record.title || '';
    const coordinatorTitle = recTitle.startsWith('关于')
      ? `有关“${recTitle}”的协调申请`
      : `关于「${recTitle}」的协调申请`;
    setFormData(f => ({ ...f, title: coordinatorTitle, respondentId: '' }));
    setSelectedRespondent([]);
  };

  const clearRecord = () => {
    setSelectedRecord(null);
    setRecordSearchTerm('');
    setRecordSearchResults([]);
    setFormData(f => ({ ...f, title: '', respondentId: '' }));
    setSelectedRespondent([]);
  };

  const handleApply = async () => {
    if (!user?.id || !formData.title.trim() || !formData.respondentId) return;
    setSaving(true);
    try {
      const response = await fetch('/api/mediations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          applicantName: user.real_name || user.display_name || '',
          title: formData.title,
          respondentId: formData.respondentId,
          respondentName: formData.respondentName || '',
          disputeType: 'coordination',
          description: formData.reason,
          evidence: formData.evidence,
          expectedResult: formData.expectedResult
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowApplyModal(false);
        setFormData({ title: '', respondentId: '', respondentName: '', reason: '', evidence: '', expectedResult: '', relationshipId: '' });
        setSelectedRespondent([]);
        setEvidenceFiles([]);
        setSearchResults([]);
        setShowDropdown(false);
        setCreatedMediationId(data.id);
        setSuccessMsg('协调申请已成功提交！');
        fetchMediations();
        // 3秒后自动清除
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        alert('提交失败：' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('提交协调申请失败:', error);
      alert('网络错误，请重试');
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
                <p className="text-white/80">公正协调，化纷止争，正向促成</p>
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
          {/* 角色标签 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setActiveRole('applicant')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeRole === 'applicant'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              作为申请方
            </button>
            <button
              onClick={() => setActiveRole('respondent')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeRole === 'respondent'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              作为被协调方
            </button>
          </div>
          {/* 成功提示 */}
          {successMsg && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMsg}</p>
                {createdMediationId && (
                  <p className="text-xs text-green-600 dark:text-green-500 mt-0.5 font-mono">
                    协调编号：{createdMediationId.slice(0, 8).toUpperCase()}
                  </p>
                )}
              </div>
              <button onClick={() => setSuccessMsg('')} className="text-green-400 hover:text-green-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
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
                const status = statusConfig[mediation.status] || statusConfig.unassigned;
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
              onClick={() => { setShowApplyModal(false); setRecordSearchTerm(''); setRecordSearchResults([]); setSelectedRecord(null); setSelectedRespondent([]); setEvidenceFiles([]); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">申请协调</h3>
                  <button onClick={() => { setShowApplyModal(false); setRecordSearchTerm(''); setRecordSearchResults([]); setSelectedRecord(null); setSelectedRespondent([]); setEvidenceFiles([]); }}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* 协调事项：输入记录ID或关键字搜索 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      协调事项 *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={recordSearchTerm}
                        onChange={e => searchRecords(e.target.value)}
                        onFocus={() => { if (recordSearchResults.length > 0) setShowRecordDropdown(true); }}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 pr-10"
                        placeholder="输入认知留痕记录ID或关键字..."
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      {selectedRecord && (
                        <button 
                          type="button"
                          onClick={clearRecord}
                          className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {showRecordDropdown && recordSearchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {recordSearchResults.map((r: any) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => selectRecord(r)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{r.title}</span>
                                <span className="text-xs text-slate-400">{r.record_type || '—'}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedRecord && (
                      <p className="text-xs text-green-600 mt-1">已选记录：{selectedRecord.title}</p>
                    )}
                    {/* 协调标题自动生成 */}
                    <div className="mt-2">
                      <label className="block text-xs text-slate-400 mb-1">协调标题（自动生成）</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm"
                        placeholder="可手动修改"
                      />
                    </div>
                  </div>

                  {/* 被协调人：UserSelect */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      被协调人 <span className="text-red-500">*</span>
                    </label>
                    <UserSelect
                      onSelect={user => {
                        // 如果已选中则取消，否则选中
                        if (selectedRespondent.find(u => u.id === user.id)) {
                          setSelectedRespondent([]);
                          setFormData(f => ({ ...f, respondentId: '', respondentName: '' }));
                        } else {
                          setSelectedRespondent([user]);
                          setFormData(f => ({ ...f, respondentId: user.id, respondentName: user.real_name || user.display_name || '' }));
                        }
                      }}
                      selectedUsers={selectedRespondent}
                      placeholder="搜索选择被协调人..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      协调原因 *
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={e => setFormData(f => ({ ...f, reason: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={3}
                      placeholder="详细描述协调原因..."
                    />
                  </div>
                  {/* 相关证据：图片/文件上传 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      相关证据
                    </label>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center">
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                        multiple
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setEvidenceFiles(prev => [...prev, ...files]);
                          }
                          e.target.value = '';
                        }}
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                      />
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full cursor-pointer">
                        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                        <p className="text-sm text-slate-500">点击上传图片或文件</p>
                        <p className="text-xs text-slate-400 mt-1">支持 JPG/PNG/PDF/DOC/ZIP</p>
                      </button>
                    </div>
                    {evidenceFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {evidenceFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            {f.type.startsWith('image/') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            <span className="flex-1 truncate">{f.name}</span>
                            <button onClick={() => setEvidenceFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={formData.evidence}
                      onChange={e => setFormData(f => ({ ...f, evidence: e.target.value }))}
                      className="w-full mt-3 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={2}
                      placeholder="补充说明相关证据..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      期望结果
                    </label>
                    <textarea
                      value={formData.expectedResult}
                      onChange={e => setFormData(f => ({ ...f, expectedResult: e.target.value }))}
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
                onClick={e => e.stopPropagation()}
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
