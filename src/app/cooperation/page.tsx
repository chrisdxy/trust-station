"use client";
import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, X, Loader2, ChevronRight, Copy, Check, Edit, Archive, FileText, History } from 'lucide-react';
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
  type: string;
  cooperation_level: string;
  description?: string;
  goals_and_principles?: string;
  partner_id?: string;
  partner_name?: string;
  user_id?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

interface Archive {
  id: string;
  relationship_id: string;
  version: number;
  title: string;
  description?: string;
  goals_and_principles?: string;
  partner_name?: string;
  cooperation_level?: string;
  status?: string;
  archived_at: string;
  archived_by?: string;
}

export default function CooperationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'intended' | 'relationship' | 'archived'>('all');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddIntendedModal, setShowAddIntendedModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveDetailModal, setShowArchiveDetailModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<UserSearchResult[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goals_and_principles: '',
  });
  const [intentedFormData, setIntentedFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedIntendedPartners, setSelectedIntendedPartners] = useState<UserSearchResult[]>([]);
  const [createdRelationshipId, setCreatedRelationshipId] = useState<string | null>(null);
  const [relationshipIdCopied, setRelationshipIdCopied] = useState(false);
  const [selectedRel, setSelectedRel] = useState<Relationship | null>(null);
  const [editingRel, setEditingRel] = useState<Relationship | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    goals_and_principles: '',
    cooperation_level: '',
    status: '',
  });
  const [selectedArchive, setSelectedArchive] = useState<Archive | null>(null);
  const [selectedArchiveRelId, setSelectedArchiveRelId] = useState<string | null>(null);

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

  const currentUser = user;

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/relationships?userId=${currentUser.id}`);
      const data = await response.json();
      if (data.success) setRelationships(data.relationships || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载所有合作事项的存档
  const fetchArchives = async () => {
    if (!currentUser?.id) return;
    try {
      // 获取所有相关合作事项的存档
      const allArchives: Archive[] = [];
      for (const rel of relationships) {
        const res = await fetch(`/api/relationships/archives?relationshipId=${rel.id}&userId=${currentUser.id}`);
        const data = await res.json();
        if (data.success && data.archives) {
          allArchives.push(...data.archives);
        }
      }
      setArchives(allArchives);
    } catch (error) {
      console.error('获取存档失败:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'archived' && relationships.length > 0) {
      fetchArchives();
    }
  }, [activeTab, relationships]);

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
          userId: currentUser?.id || '',
          title: formData.title,
          description: formData.description,
          goals_and_principles: formData.goals_and_principles,
          partner_id: selectedPartners.map(p => p.id).join(','),
          partner_name: selectedPartners.map(p => p.real_name || p.display_name || '').join(','),
          type: 'relationship',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCreatedRelationshipId(data.id);
        setShowAddModal(false);
        setFormData({ title: '', description: '', goals_and_principles: '' });
        setSelectedPartners([]);
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
          userId: currentUser?.id || '',
          title: intentedFormData.title,
          description: intentedFormData.description,
          type: 'intended',
          partner_id: selectedIntendedPartners.map(p => p.id).join(','),
          partner_name: selectedIntendedPartners.map(p => p.real_name || p.display_name || '').join(','),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCreatedRelationshipId(data.id);
        setShowAddIntendedModal(false);
        setIntentedFormData({ title: '', description: '' });
        setSelectedIntendedPartners([]);
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

  // 编辑合作事项
  const handleEdit = async () => {
    if (!editingRel) return;
    setAdding(true);
    try {
      const response = await fetch(`/api/relationships?id=${editingRel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || '',
          title: editFormData.title,
          description: editFormData.description,
          goals_and_principles: editFormData.goals_and_principles,
          cooperation_level: editFormData.cooperation_level,
          status: editFormData.status,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingRel(null);
        fetchData();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      alert('更新失败');
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (rel: Relationship) => {
    setEditingRel(rel);
    setEditFormData({
      title: rel.title || '',
      description: rel.description || '',
      goals_and_principles: rel.goals_and_principles || '',
      cooperation_level: rel.cooperation_level || 'relationship',
      status: rel.status || 'pending',
    });
    setShowEditModal(true);
  };

  const filteredRelationships = relationships
    .filter(r => {
      if (activeTab === 'all') return true;
      if (activeTab === 'relationship') return r.cooperation_level !== 'intended';
      if (activeTab === 'intended') return r.cooperation_level === 'intended';
      return false;
    })
    .filter(r =>
      !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.serial_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // 判断当前用户是否是相关方（可编辑）
  const isParty = (rel: Relationship) => {
    return currentUser?.id && (rel.user_id === currentUser.id || rel.partner_id === currentUser.id);
  };

  const tabs = [
    { key: 'all' as const, label: '全部', icon: <FileText className="w-4 h-4" /> },
    { key: 'intended' as const, label: '意向合作', icon: <Users className="w-4 h-4" /> },
    { key: 'relationship' as const, label: '正式合作', icon: <Users className="w-4 h-4" /> },
    { key: 'archived' as const, label: '已存档', icon: <Archive className="w-4 h-4" /> },
  ];

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
              {activeTab !== 'archived' && (
                <button
                  onClick={() => activeTab === 'intended' ? setShowAddIntendedModal(true) : setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  {activeTab === 'intended' ? '添加意向合作' : '添加正式合作'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 提示 */}
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

          {activeTab === 'relationship' && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-sm text-green-800 dark:text-green-200">
                正式合作是合约（合同与协议简称）已签字和/或盖章或以其他形式产生权利义务、形成信赖关系的交集事项。
              </p>
            </div>
          )}

          {activeTab === 'all' && (
            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
              <p className="text-sm text-indigo-800 dark:text-indigo-200">
                显示您作为相关方的全部合作事项（意向合作 + 正式合作）。编辑修改前系统会自动存档，可在"已存档"标签查看历史版本。
              </p>
            </div>
          )}

          {activeTab === 'archived' && (
            <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                已存档记录为合作事项编辑前的自动存档，同一合作事项可有多个版本，ID相同但版本号不同。
              </p>
            </div>
          )}
        </div>

        {/* 搜索 */}
        {activeTab !== 'archived' && (
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === 'intended' ? '搜索意向合作...' : activeTab === 'relationship' ? '搜索正式合作...' : '搜索全部合作...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        )}

        {/* 内容 — 活跃合作 */}
        {activeTab !== 'archived' && (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredRelationships.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>
                  {activeTab === 'intended' ? '暂无意向合作' :
                   activeTab === 'relationship' ? '暂无正式合作' : '暂无合作事项'}
                </p>
                <p className="text-sm mt-2">
                  点击右上角添加您的第一个{activeTab === 'intended' ? '意向合作' : '正式合作'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRelationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedRel(rel)}
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-pointer hover:bg-amber-200 transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getShortRelationshipId(rel.id)).then(() => alert('ID已复制: ' + getShortRelationshipId(rel.id))); }}
                            title="点击复制合作ID">
                            合作ID: {getShortRelationshipId(rel.id)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            rel.cooperation_level === 'intended'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {rel.cooperation_level === 'intended' ? '意向合作' : '正式合作'}
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
                          {rel.version && rel.version > 1 && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                              v{rel.version}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{rel.title}</h3>
                        {rel.partner_name && (
                          <p className="text-sm text-indigo-500 mt-1">合作方: {rel.partner_name}</p>
                        )}
                        {rel.description && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{rel.description.replace(/<[^>]*>/g, '')}</p>
                        )}
                        {rel.created_at && (
                          <p className="text-xs text-slate-400 mt-2">
                            创建于 {new Date(rel.created_at).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        {isParty(rel) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(rel); }}
                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight
                          className="w-5 h-5 text-slate-400 cursor-pointer"
                          onClick={() => setSelectedRel(rel)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 内容 — 已存档 */}
        {activeTab === 'archived' && (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            {archives.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Archive className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>暂无存档记录</p>
                <p className="text-sm mt-2">编辑合作事项时系统会自动存档旧版本</p>
              </div>
            ) : (
              <div className="space-y-4">
                {archives.map((archive) => (
                  <div
                    key={archive.id}
                    onClick={() => { setSelectedArchive(archive); setShowArchiveDetailModal(true); }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            合作ID: {getShortRelationshipId(archive.relationship_id)}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                            版本 v{archive.version}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            archive.cooperation_level === 'intended'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {archive.cooperation_level === 'intended' ? '意向合作' : '正式合作'}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{archive.title}</h3>
                        {archive.partner_name && (
                          <p className="text-sm text-indigo-500 mt-1">合作方: {archive.partner_name}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          存档于 {new Date(archive.archived_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <History className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 详情弹窗 */}
        {selectedRel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRel(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">合作事项详情</h3>
                <button onClick={() => setSelectedRel(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{getShortRelationshipId(selectedRel.id)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedRel.cooperation_level === 'intended' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>{selectedRel.cooperation_level === 'intended' ? '意向合作' : '正式合作'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedRel.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>{selectedRel.status === 'pending' ? '待确认' : selectedRel.status}</span>
                  {selectedRel.version && selectedRel.version > 1 && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                      版本 v{selectedRel.version}
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500">标题</label>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">{selectedRel.title}</p>
                </div>
                {selectedRel.partner_name && (
                  <div>
                    <label className="text-xs text-slate-500">合作方</label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">{selectedRel.partner_name}</p>
                  </div>
                )}
                {selectedRel.goals_and_principles && (
                  <div>
                    <label className="text-xs text-slate-500">合作目标与原则</label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{selectedRel.goals_and_principles}</p>
                  </div>
                )}
                {selectedRel.description && (
                  <div>
                    <label className="text-xs text-slate-500">详情</label>
                    <div className="text-slate-700 dark:text-slate-300 mt-1 prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: selectedRel.description }} />
                  </div>
                )}
                {selectedRel.created_at && (
                  <div>
                    <label className="text-xs text-slate-500">创建时间</label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">{new Date(selectedRel.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                )}
              </div>
              {/* 查看历史版本 */}
              {isParty(selectedRel) && (
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/relationships/archives?relationshipId=${selectedRel.id}&userId=${currentUser?.id}`);
                      const data = await res.json();
                      if (data.success && data.archives?.length > 0) {
                        setArchives(prev => [...prev.filter(a => a.relationship_id !== selectedRel.id), ...data.archives]);
                      }
                      setSelectedArchiveRelId(selectedRel.id);
                      setSelectedRel(null);
                      setActiveTab('archived');
                    }}
                    className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600"
                  >
                    <History className="w-4 h-4" />
                    查看历史版本（{selectedRel.version && selectedRel.version > 1 ? `${selectedRel.version - 1}个存档` : '暂无存档'}）
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 存档详情弹窗 */}
        {showArchiveDetailModal && selectedArchive && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowArchiveDetailModal(false); setSelectedArchive(null); }}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  存档版本 v{selectedArchive.version}
                </h3>
                <button onClick={() => { setShowArchiveDetailModal(false); setSelectedArchive(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                    合作ID: {getShortRelationshipId(selectedArchive.relationship_id)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    selectedArchive.cooperation_level === 'intended' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {selectedArchive.cooperation_level === 'intended' ? '意向合作' : '正式合作'}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-slate-500">标题</label>
                  <p className="font-semibold text-slate-900 dark:text-white mt-1">{selectedArchive.title}</p>
                </div>
                {selectedArchive.partner_name && (
                  <div>
                    <label className="text-xs text-slate-500">合作方</label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">{selectedArchive.partner_name}</p>
                  </div>
                )}
                {selectedArchive.goals_and_principles && (
                  <div>
                    <label className="text-xs text-slate-500">合作目标与原则</label>
                    <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{selectedArchive.goals_and_principles}</p>
                  </div>
                )}
                {selectedArchive.description && (
                  <div>
                    <label className="text-xs text-slate-500">详情</label>
                    <div className="text-slate-700 dark:text-slate-300 mt-1 prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: selectedArchive.description }} />
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-500">存档时间</label>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{new Date(selectedArchive.archived_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 编辑弹窗 */}
        {showEditModal && editingRel && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">编辑合作事项</h3>
                <button onClick={() => setShowEditModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>当前版本 v{editingRel.version || 1}</span>
                  <span>·</span>
                  <span>保存后将自动存档当前版本</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    合作层级
                  </label>
                  <select
                    value={editFormData.cooperation_level}
                    onChange={(e) => setEditFormData({ ...editFormData, cooperation_level: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  >
                    <option value="intended">意向合作</option>
                    <option value="relationship">正式合作</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    状态
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  >
                    <option value="pending">待确认</option>
                    <option value="active">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
                </div>
                {editFormData.cooperation_level !== 'intended' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      合作目标与原则
                    </label>
                    <textarea
                      value={editFormData.goals_and_principles}
                      onChange={(e) => setEditFormData({ ...editFormData, goals_and_principles: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    合作详情
                  </label>
                  <RichTextEditor
                    value={editFormData.description}
                    onChange={(val) => setEditFormData({ ...editFormData, description: val })}
                    placeholder="请输入合作详情（支持链接、图片）"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={adding}
                    className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {adding ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 添加弹窗 - 正式合作 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                    onSelect={(user) => {
                      setSelectedPartners(prev => {
                        const exists = prev.find(p => p.id === user.id);
                        if (exists) return prev.filter(p => p.id !== user.id);
                        return [...prev, user];
                      });
                    }}
                    selectedUsers={selectedPartners}
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
                  <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleAdd} disabled={adding} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50">
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">创建成功</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">合作关系已创建</p>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddIntendedModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                    onSelect={(user) => {
                      setSelectedIntendedPartners(prev => {
                        const exists = prev.find(p => p.id === user.id);
                        if (exists) return prev.filter(p => p.id !== user.id);
                        return [...prev, user];
                      });
                    }}
                    selectedUsers={selectedIntendedPartners}
                    placeholder="搜索意向合作方..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    详情
                  </label>
                  <RichTextEditor
                    value={intentedFormData.description}
                    onChange={(val) => setIntentedFormData({ ...intentedFormData, description: val })}
                    placeholder="（1）意向合作交易要点；（2）是否要了解意向合作方过往哪个类型的记录。"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddIntendedModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">取消</button>
                  <button onClick={handleAddIntended} disabled={adding} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50">
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
