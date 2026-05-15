"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, X, Loader2, ChevronRight, Copy, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '@/components/Layout';
import RichTextEditor from '@/components/RichTextEditor';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';

interface Relationship {
  id: string;
  serial_number: string;
  title: string;
  status: string;
  type: string; // relationship | intended
  description?: string;
  goals_and_principles?: string;
  created_at?: string;
}

export default function CooperationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'intended' | 'relationship'>('intended');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddIntendedModal, setShowAddIntendedModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<UserSearchResult | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goals_and_principles: '',
  });
  const [intentedFormData, setIntentedFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedIntendedPartner, setSelectedIntendedPartner] = useState<UserSearchResult | null>(null);
  const [localUser, setLocalUser] = useState<any>(null);
  const [createdRelationshipId, setCreatedRelationshipId] = useState<string | null>(null);
  const [relationshipIdCopied, setRelationshipIdCopied] = useState(false);

  const getShortRelationshipId = (id: string) => {
    return 'REL' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  const copyRelationshipId = async () => {
    if (createdRelationshipId) {
      await navigator.clipboard.writeText(getShortRelationshipId(createdRelationshipId));
      setRelationshipIdCopied(true);
      setTimeout(() => setRelationshipIdCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user') || localStorage.getItem('user_data');
      if (savedUser) {
        setLocalUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const currentUser = user || localUser;

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/relationships?userId=${currentUser.id}&type=all`);
      const data = await response.json();
      if (data.success) setRelationships(data.relationships || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.title.trim()) {
      alert('请输入合作标题');
      return;
    }
    setAdding(true);
    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: formData.title,
          description: formData.description,
          goals_and_principles: formData.goals_and_principles,
          partner_id: selectedPartner?.id,
          partner_name: selectedPartner?.real_name || selectedPartner?.display_name || '',
          type: 'relationship',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCreatedRelationshipId(data.id);
        setShowAddModal(false);
        setFormData({ title: '', description: '', goals_and_principles: '' });
        setSelectedPartner(null);
        fetchData();
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      alert('添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleAddIntended = async () => {
    if (!intentedFormData.title.trim()) {
      alert('请输入意向合作标题');
      return;
    }
    setAdding(true);
    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: intentedFormData.title,
          description: intentedFormData.description,
          type: 'intended',
          partner_id: selectedIntendedPartner?.id,
          partner_name: selectedIntendedPartner?.real_name || selectedIntendedPartner?.display_name || '',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCreatedRelationshipId(data.id);
        setShowAddIntendedModal(false);
        setIntentedFormData({ title: '', description: '' });
        setSelectedIntendedPartner(null);
        fetchData();
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      alert('添加失败');
    } finally {
      setAdding(false);
    }
  };

  const filteredRelationships = relationships
    .filter(r => {
      if (activeTab === 'relationship') return r.type !== 'intended';
      if (activeTab === 'intended') return r.type === 'intended';
      return true;
    })
    .filter(r =>
      !searchTerm || 
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">合作中心</h1>
                <p className="text-white/80">登记您的合伙、合作及与他人的其他交集事项</p>
              </div>
              {activeTab === 'intended' ? (
                <button
                  onClick={() => setShowAddIntendedModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  添加意向合作
                </button>
              ) : (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  添加正式合作
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('intended')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'intended'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              意向合作
            </button>
            <button
              onClick={() => setActiveTab('relationship')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'relationship'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              正式合作
            </button>
          </div>
          
          {/* 意向合作提示 */}
          {activeTab === 'intended' && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">1.</span>
                  <span>意向阶段主要是接触了解、洽谈、准备阶段；</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">2.</span>
                  <span>意向阶段可能存在不慎重，甚至欺诈、损害情形，故记录必要。</span>
                </li>
              </ul>
            </div>
          )}

          {/* 正式合作提示 */}
          {activeTab === 'relationship' && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm text-green-800 dark:text-green-200">
                正式合作是合约（合同与协议简称）已签字和/或盖章或以其他形式产生权利义务、形成信赖关系的交集事项。
              </p>
            </div>
          )}
        </div>

        {/* 搜索 */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'intended' ? '搜索意向合作...' : '搜索正式合作...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* 内容 */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredRelationships.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>{activeTab === 'intended' ? '暂无意向合作' : '暂无正式合作'}</p>
              <p className="text-sm mt-2">点击右上角添加您的第一个{activeTab === 'intended' ? '意向合作' : '正式合作'}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRelationships.map((rel, index) => (
                <div
                  key={rel.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {getShortRelationshipId(rel.id)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rel.status === 'active' ? 'bg-green-100 text-green-700' :
                          rel.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          rel.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {rel.status === 'active' ? '进行中' :
                           rel.status === 'pending' ? '待确认' :
                           rel.status === 'completed' ? '已完成' : rel.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{rel.title}</h3>
                      {rel.description && (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{rel.description}</p>
                      )}
                      {rel.created_at && (
                        <p className="text-xs text-slate-400 mt-2">
                          创建于 {new Date(rel.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 添加弹窗 - 正式合作 */}
        {showAddModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加正式合作</h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    合作标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入合作标题"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    合作方
                  </label>
                  <UserSelect
                    onSelect={(user) => setSelectedPartner(user)}
                    selectedUsers={selectedPartner ? [selectedPartner] : []}
                    placeholder="搜索合作方..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    合作目标与原则
                  </label>
                  <textarea
                    value={formData.goals_and_principles}
                    onChange={(e) => setFormData({ ...formData, goals_and_principles: e.target.value })}
                    placeholder="请输入合作目标与原则"
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    合作详情
                  </label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(val) => setFormData({ ...formData, description: val })}
                    placeholder="请输入合作详情（支持链接、图片）"
                  />
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    （不要输入隐私、商业秘密及依法不得输入的事项）
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {adding ? '添加中...' : '添加'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成功弹窗 */}
        <AnimatePresence>
          {createdRelationshipId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
              onClick={() => setCreatedRelationshipId(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-sm text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-8 h-8 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  创建成功
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  合作关系已创建
                </p>
                <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl mb-4">
                  <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                    {getShortRelationshipId(createdRelationshipId)}
                  </span>
                  <button
                    onClick={copyRelationshipId}
                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                  >
                    {relationshipIdCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-500" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setCreatedRelationshipId(null)}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  完成
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 添加意向合作弹窗 */}
        {showAddIntendedModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddIntendedModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加意向合作</h3>
                <button onClick={() => setShowAddIntendedModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={intentedFormData.title}
                    onChange={(e) => setIntentedFormData({ ...intentedFormData, title: e.target.value })}
                    placeholder="请输入意向合作标题"
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    意向方
                  </label>
                  <UserSelect
                    onSelect={(user) => setSelectedIntendedPartner(user)}
                    selectedUsers={selectedIntendedPartner ? [selectedIntendedPartner] : []}
                    placeholder="搜索意向合作方..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    详情
                  </label>
                  <textarea
                    value={intentedFormData.description}
                    onChange={(e) => setIntentedFormData({ ...intentedFormData, description: e.target.value })}
                    placeholder={"请输入：（1）意向合作交易要点；（2）是否要了解意向合作方过往哪个类型的记录。"}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddIntendedModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddIntended}
                    disabled={adding}
                    className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {adding ? '添加中...' : '添加'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
