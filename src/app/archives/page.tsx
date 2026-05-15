"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Key, Search, X, Loader2, Plus,
  Calendar, Shield, Clock, CheckCircle, Eye, EyeOff, Trash2,
  Users, MessageSquare, AlertCircle, Scale, ChevronDown, Check, Copy
} from 'lucide-react';
import Layout from '@/components/Layout';
import RichTextEditor from '@/components/RichTextEditor';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Record {
  id: string;
  title: string;
  record_type: string;
  visibility: string;
  relationship_id?: string;
  content?: string;
  created_at?: string;
  // 可看记录额外字段
  authorization_id?: string;
  grantor_id?: string;
  grantor_name?: string;
  grantor_real_name?: string;
  scope?: string;
  auth_description?: string;
}

interface Authorization {
  id: string;
  grantee_email?: string;
  grantee_name: string;
  scope: string;
  status: string;
  description?: string;
  expiry_date?: string;
  created_at?: string;
}

type TabType = 'records' | 'authorizations' | 'accessible';

export default function ArchivesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('records');
  const [records, setRecords] = useState<Record[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 弹窗状态
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showAddAuthorizationModal, setShowAddAuthorizationModal] = useState(false);

  // 认知留痕ID状态
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null);
  const [recordIdCopied, setRecordIdCopied] = useState(false);

  const getShortRecordId = (id: string) => {
    return 'RCD' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  const copyRecordId = async () => {
    if (createdRecordId) {
      await navigator.clipboard.writeText(getShortRecordId(createdRecordId));
      setRecordIdCopied(true);
      setTimeout(() => setRecordIdCopied(false), 2000);
    }
  };

  // 表单数据
  const [recordForm, setRecordForm] = useState({
    title: '',
    content: '',
    recordType: 'insight',
    visibility: 'private',
    relationship_id: '',
    relationship_title: '',
    related_type: '',
    related_id: '',
    related_title: '',
    related_parties: [] as UserSearchResult[], // 有关方
  });
  
  // 有关方 - 用户选择
  const [selectedRelatedUsers, setSelectedRelatedUsers] = useState<UserSearchResult[]>([]);

  // 合作事项搜索状态
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [relationshipResults, setRelationshipResults] = useState<any[]>([]);
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>(null);

  // 关联事项数据
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [relatedType, setRelatedType] = useState<'community' | 'project' | 'relationship' | 'activity' | ''>('');
  const [relatedSearch, setRelatedSearch] = useState('');
  const [showRelatedDropdown, setShowRelatedDropdown] = useState(false);

  // 授权表单（多记录类型）
  const [authorizationForm, setAuthorizationForm] = useState({
    description: '',
    expiry_date: '',
    relationship_id: '',
    relationship_title: '',
    partner_id: '',
    partner_name: '',
    recordTypes: [] as string[], // 多选记录类型
  });

  // 授权合作事项搜索状态（用于选择被授权人）
  const [authRelationshipSearch, setAuthRelationshipSearch] = useState('');
  const [authRelationshipResults, setAuthRelationshipResults] = useState<any[]>([]);
  const [showAuthRelationshipDropdown, setShowAuthRelationshipDropdown] = useState(false);
  const [selectedAuthRelationship, setSelectedAuthRelationship] = useState<any>(null);

  // 被授权人列表（UserSelect组件用）
  const [selectedGrantees, setSelectedGrantees] = useState<UserSearchResult[]>([]);

  // 认知留痕记录
  const recordTypeOptions = [
    { value: 'insight', label: '认知' },
    { value: 'learning', label: '学习' },
    { value: 'reflection', label: '反思' },
    { value: 'achievement', label: '成就' },
  ];
  const [dynamicRecordCategories, setDynamicRecordCategories] = useState<{id: string, name: string}[]>([]);

  // 动态分类优先，否则用硬编码兜底
  const effectiveRecordTypes = dynamicRecordCategories.length > 0
    ? dynamicRecordCategories.map(c => ({ value: c.id, label: c.name }))
    : recordTypeOptions;

  // 备用检查：直接从 localStorage 读取用户数据
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user') || localStorage.getItem('user_data');
      if (savedUser) {
        setLocalUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const currentUser = user || localUser;

  // 获取记录分类（与后台 record_type 打通）
  const fetchRecordCategories = async () => {
    try {
      const res = await fetch('/api/categories?type=record_type');
      const data = await res.json();
      if (data.success && data.categories?.length > 0) {
        setDynamicRecordCategories(data.categories);
      }
    } catch (e) { /* ignore, fallback to hardcoded */ }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
      fetchRecordCategories();
    }
  }, [currentUser, activeTab]);

  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      if (activeTab === 'records') {
        const response = await fetch(`/api/records?userId=${currentUser.id}`);
        const data = await response.json();
        if (data.success) setRecords(data.records || []);
      } else if (activeTab === 'authorizations') {
        const response = await fetch(`/api/authorizations?userId=${currentUser.id}`);
        const data = await response.json();
        if (data.success) setAuthorizations(data.authorizations || []);
      } else if (activeTab === 'accessible') {
        // 获取被授权的记录
        const response = await fetch(`/api/authorizations/accessible?userId=${currentUser.id}`);
        const data = await response.json();
        if (data.success) setRecords(data.records || []);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索认知留痕记录
  const searchAuthRelationships = async (term: string) => {
    setAuthRelationshipSearch(term);
    setShowAuthRelationshipDropdown(true);
    if (term.length < 1) {
      setAuthRelationshipResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/records?userId=${currentUser.id}&limit=100`);
      const data = await response.json();
      if (data.success) {
        const filtered = (data.records || [])
          .filter((r: any) => 
            r.title?.toLowerCase().includes(term.toLowerCase()) ||
            r.content?.toLowerCase().includes(term.toLowerCase())
          );
        setAuthRelationshipResults(filtered);
      }
    } catch (error) {
      console.error('搜索认知留痕失败:', error);
    }
  };

  // 选择认知留痕记录
  const selectAuthRelationship = async (record: any) => {
    setSelectedAuthRelationship(record);
    setAuthRelationshipSearch(record.title || record.content?.slice(0, 30) || '无标题');
    setAuthorizationForm(prev => ({ 
      ...prev, 
      relationship_id: record.related_id || record.relationship_id || null,
      relationship_title: record.related_title || record.relationship_title || null,
    }));
    setShowAuthRelationshipDropdown(false);
  };

  // 清除认知留痕选择
  const clearAuthRelationship = () => {
    setSelectedAuthRelationship(null);
    setAuthRelationshipSearch('');
    setAuthRelationshipResults([]);
    setAuthorizationForm(prev => ({ 
      ...prev, 
      relationship_id: '', 
      relationship_title: '',
    }));
  };

  // 获取关联事项列表
  const fetchRelatedItems = async (type: 'community' | 'project' | 'relationship' | 'activity') => {
    try {
      let url = '';
      if (type === 'community') {
        url = '/api/communities?limit=100';
      } else if (type === 'project') {
        url = '/api/projects?limit=100';
      } else if (type === 'relationship') {
        url = '/api/relationships?limit=100';
      } else if (type === 'activity') {
        url = '/api/activities?limit=100';
      }
      
      if (url) {
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setRelatedItems(data.communities || data.projects || data.relationships || data.activities || []);
        }
      }
    } catch (error) {
      console.error('获取关联事项失败:', error);
    }
  };

  // 切换关联类型
  const handleRelatedTypeChange = (type: 'community' | 'project' | 'relationship' | 'activity') => {
    setRelatedType(type);
    setRecordForm(prev => ({ ...prev, related_type: type, related_id: '', related_title: '' }));
    setRelatedSearch('');
    fetchRelatedItems(type);
    setShowRelatedDropdown(true);
  };

  // 选择关联事项
  const handleRelatedSelect = (item: any) => {
    let title = '';
    if (relatedType === 'community') {
      title = item.name;
    } else if (relatedType === 'project') {
      title = item.title;
    } else if (relatedType === 'relationship') {
      title = item.title;
    } else if (relatedType === 'activity') {
      title = item.title;
    }
    setRelatedSearch(title);
    setRecordForm(prev => ({ ...prev, related_id: item.id, related_title: title }));
    setShowRelatedDropdown(false);
  };

  // 清除关联事项
  const clearRelated = () => {
    setRelatedType('');
    setRelatedItems([]);
    setRelatedSearch('');
    setSelectedRelatedUsers([]);
    setRecordForm(prev => ({ ...prev, related_type: '', related_id: '', related_title: '' }));
  };

  // 多选/单选记录类型切换
  const toggleRecordType = (value: string) => {
    setAuthorizationForm(prev => {
      const current = prev.recordTypes;
      if (current.includes(value)) {
        return { ...prev, recordTypes: current.filter(v => v !== value) };
      } else {
        return { ...prev, recordTypes: [...current, value] };
      }
    });
  };

  // 添加记录
  const handleAddRecord = async () => {
    if (!recordForm.title.trim()) {
      alert('请输入标题');
      return;
    }
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: recordForm.title,
          content: recordForm.content,
          record_type: recordForm.recordType,
          visibility: recordForm.visibility,
          relationship_id: recordForm.relationship_id || null,
          related_type: recordForm.related_type || null,
          related_id: recordForm.related_id || null,
          related_title: recordForm.related_title || null,
          related_parties: selectedRelatedUsers.map(u => u.id) || [],
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCreatedRecordId(data.id);
        setShowAddRecordModal(false);
        setRecordForm({ title: '', content: '', recordType: 'insight', visibility: 'private', relationship_id: '', relationship_title: '', related_type: '', related_id: '', related_title: '', related_parties: [] });
        setSelectedRelatedUsers([]);
        clearRelated();
        fetchData();
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加记录失败:', error);
    }
  };

  // 添加授权
  const handleAddAuthorization = async () => {
    if (!authorizationForm.partner_id) {
      alert('请选择被授权人');
      return;
    }
    if (authorizationForm.recordTypes.length === 0) {
      alert('请选择至少一个授权查看类型');
      return;
    }
    try {
      const response = await fetch('/api/authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          partner_id: authorizationForm.partner_id,
          partner_name: authorizationForm.partner_name,
          scope: authorizationForm.recordTypes, // 数组，后端转为逗号分隔
          description: authorizationForm.description,
          expiry_date: authorizationForm.expiry_date || null,
          relationship_id: authorizationForm.relationship_id || null,
          relationship_title: authorizationForm.relationship_title || null,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddAuthorizationModal(false);
        setAuthorizationForm({ description: '', expiry_date: '', relationship_id: '', relationship_title: '', partner_id: '', partner_name: '', recordTypes: [] });
        setSelectedGrantees([]);
        clearAuthRelationship();
        fetchData();
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('添加授权失败:', error);
    }
  };

  // 删除授权
  const handleDeleteAuthorization = async (id: string) => {
    if (!confirm('确定要删除此授权吗？')) return;
    try {
      const response = await fetch(`/api/authorizations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除授权失败:', error);
    }
  };

  // 重置授权弹窗
  const resetAuthorizationForm = () => {
    setAuthorizationForm({ description: '', expiry_date: '', relationship_id: '', relationship_title: '', partner_id: '', partner_name: '', recordTypes: [] });
    setSelectedGrantees([]);
    clearAuthRelationship();
  };

  const tabs = [
    { id: 'records' as TabType, label: '认知留痕', icon: FileText },
    { id: 'authorizations' as TabType, label: '授权查询', icon: Key },
    { id: 'accessible' as TabType, label: '可看记录', icon: Eye },
  ];

  const filteredRecords = records.filter(r =>
    !searchTerm || r.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAuthorizations = authorizations.filter(a =>
    !searchTerm || 
    a.grantee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.grantee_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'insight': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'learning': return <FileText className="w-4 h-4 text-green-500" />;
      case 'reflection': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'achievement': return <Scale className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRecordTypeLabel = (type: string) => {
    const option = effectiveRecordTypes.find(o => o.value === type);
    return option?.label || type;
  };

  const getRecordTypeBg = (type: string) => {
    switch (type) {
      case 'insight': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case 'learning': return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case 'reflection': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case 'achievement': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  // 将 scope 字段（逗号分隔）解析为类型标签数组
  const getScopeLabels = (scope: string) => {
    if (!scope) return [];
    return scope.split(',').map(s => getRecordTypeLabel(s.trim())).filter(Boolean);
  };

  // 获取记录类型的按钮样式
  const getRecordTypeBtnClass = (value: string) => {
    const isSelected = authorizationForm.recordTypes.includes(value);
    return `px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
      isSelected
        ? 'bg-indigo-500 text-white'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
    }`;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">记录中心（正心链）</h1>
                <p className="text-white/80">忧人心多变，就上正心链！</p>
              </div>
              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                {activeTab === 'records' && (
                  <button
                    onClick={() => setShowAddRecordModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加记录
                  </button>
                )}
                {activeTab === 'authorizations' && (
                  <button
                    onClick={() => { resetAuthorizationForm(); setShowAddAuthorizationModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加授权
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-4 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索 */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={`搜索${tabs.find(t => t.id === activeTab)?.label}...`}
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
          ) : (
            <div className="space-y-6">
              {/* 认知留痕 */}
              {activeTab === 'records' && (
                filteredRecords.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>暂无记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecords.map((rec, index) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {getShortRecordId(rec.id)}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getRecordTypeBg(rec.record_type)}`}>
                                {getRecordTypeIcon(rec.record_type)}
                                {getRecordTypeLabel(rec.record_type)}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${rec.visibility === 'public' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {rec.visibility === 'public' ? '公开' : '私密'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{rec.title}</h3>
                            {rec.content && (
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{rec.content}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* 可看记录 */}
              {activeTab === 'accessible' && (
                filteredRecords.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                    <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>暂无可查看的授权记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecords.map((rec, index) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs ${getRecordTypeBg(rec.record_type)}`}>
                                {getRecordTypeLabel(rec.record_type)}
                              </span>
                              <span className="text-xs text-slate-400">
                                来自: {rec.grantor_name || rec.grantor_real_name || '授权方'}
                              </span>
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{rec.title}</h3>
                            {rec.auth_description && (
                              <p className="text-sm text-slate-500 mt-1">授权说明: {rec.auth_description}</p>
                            )}
                            {rec.content && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                                {rec.content.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">
                              {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* 授权查询 */}
              {activeTab === 'authorizations' && (
                filteredAuthorizations.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                    <Key className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>暂无授权记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAuthorizations.map((auth, index) => (
                      <motion.div
                        key={auth.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                auth.status === 'active' ? 'bg-green-100 text-green-700' :
                                auth.status === 'expired' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {auth.status === 'active' ? '生效中' : auth.status === 'expired' ? '已过期' : '未知'}
                              </span>
                              {/* 多类型标签 */}
                              {getScopeLabels(auth.scope).map((label, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                                  {label}
                                </span>
                              ))}
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{auth.grantee_name}</h3>
                            <p className="text-sm text-slate-500 mt-1">{auth.grantee_email}</p>
                            {auth.description && (
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{auth.description}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              有效期至：{auth.expiry_date || '永久'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteAuthorization(auth.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* 添加记录弹窗 */}
        <AnimatePresence>
          {showAddRecordModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddRecordModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加认知留痕</h3>
                  <button onClick={() => setShowAddRecordModal(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* 关联事项 - 提到类型前面 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      关联事项
                    </label>
                    <div className="space-y-2">
                      {/* 关联类型选择 */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('community')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'community'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          共同体
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('project')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'project'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          项目
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('relationship')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'relationship'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          合作事项
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('activity')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'activity'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          活动
                        </button>
                        {relatedType && (
                          <button
                            type="button"
                            onClick={clearRelated}
                            className="px-2 py-1.5 text-sm text-slate-400 hover:text-red-500"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      
                      {/* 关联事项搜索/选择 */}
                      {relatedType && (
                        <div className="relative">
                          <input
                            type="text"
                            value={relatedSearch}
                            onChange={(e) => {
                              setRelatedSearch(e.target.value);
                              setShowRelatedDropdown(true);
                              const filtered = relatedItems.filter(item => {
                                const title = relatedType === 'community' ? item.name : item.title;
                                return title.toLowerCase().includes(e.target.value.toLowerCase());
                              });
                              setRelatedItems(filtered);
                            }}
                            onFocus={() => setShowRelatedDropdown(true)}
                            placeholder={`搜索${relatedType === 'community' ? '共同体' : relatedType === 'project' ? '项目' : relatedType === 'relationship' ? '合作事项' : '活动'}...`}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                          />
                          {showRelatedDropdown && relatedItems.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {relatedItems.map(item => {
                                const title = relatedType === 'community' ? item.name : item.title;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleRelatedSelect(item)}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                                  >
                                    {title}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 有关方 - 用户选择 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      有关方
                    </label>
                    <UserSelect
                      onSelect={(user) => {
                        if (!selectedRelatedUsers.find(u => u.id === user.id)) {
                          setSelectedRelatedUsers([...selectedRelatedUsers, user]);
                        }
                      }}
                      selectedUsers={selectedRelatedUsers}
                      placeholder="搜索添加有关方..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      类型
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {effectiveRecordTypes.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRecordForm({ ...recordForm, recordType: opt.value })}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            recordForm.recordType === opt.value
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      内容
                    </label>
                    <textarea
                      value={recordForm.content}
                      onChange={(e) => setRecordForm({ ...recordForm, content: e.target.value })}
                      placeholder="请输入内容"
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddRecordModal(false)}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddRecord}
                      className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 成功弹窗 */}
        <AnimatePresence>
          {createdRecordId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
              onClick={() => setCreatedRecordId(null)}
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
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  创建成功
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  认知留痕已保存
                </p>
                <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl mb-4">
                  <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                    {getShortRecordId(createdRecordId)}
                  </span>
                  <button
                    onClick={copyRecordId}
                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                  >
                    {recordIdCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-500" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setCreatedRecordId(null)}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  完成
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 添加授权弹窗 */}
        <AnimatePresence>
          {showAddAuthorizationModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加授权</h3>
                  <button onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* 关联留痕 - 搜索认知留痕记录 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      关联留痕 <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={authRelationshipSearch}
                        onChange={(e) => searchAuthRelationships(e.target.value)}
                        onFocus={() => { setShowAuthRelationshipDropdown(true); if (authRelationshipResults.length === 0) searchAuthRelationships(''); }}
                        placeholder="搜索认知留痕..."
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                      />
                      {showAuthRelationshipDropdown && authRelationshipResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {authRelationshipResults.map((relationship: any) => (
                            <button
                              key={relationship.id}
                              type="button"
                              onClick={() => selectAuthRelationship(relationship)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${getRecordTypeBg(relationship.record_type)}`}>
                                {getRecordTypeLabel(relationship.record_type)}
                              </span>
                              <span className="truncate">{relationship.title || relationship.content?.slice(0, 30) || '无标题'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedAuthRelationship && (
                        <button 
                          type="button" 
                          onClick={clearAuthRelationship}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 被授权人 - UserSelect组件 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      被授权人 <span className="text-red-500">*</span>
                    </label>
                    <UserSelect
                      onSelect={(user) => {
                        if (!selectedGrantees.find(u => u.id === user.id)) {
                          setSelectedGrantees([...selectedGrantees, user]);
                          // 同时更新 authorizationForm
                          const newPartnerIds = [...selectedGrantees.map(u => u.id), user.id];
                          setAuthorizationForm(prev => ({
                            ...prev,
                            partner_id: newPartnerIds.join(','),
                            partner_name: newPartnerIds.map(id => {
                              const u = [...selectedGrantees, user].find(u => u.id === id);
                              return u?.real_name || u?.display_name || '用户';
                            }).join(',')
                          }));
                        }
                      }}
                      selectedUsers={selectedGrantees}
                      placeholder="搜索添加被授权人..."
                    />
                  </div>

                  {/* 授权查看类型（多选） */}
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        授权查看类型 <span className="text-red-500">*</span>
                        <span className="text-xs text-slate-400 ml-1 font-normal">(可多选)</span>
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {effectiveRecordTypes.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleRecordType(opt.value)}
                            className={getRecordTypeBtnClass(opt.value)}
                          >
                            {authorizationForm.recordTypes.includes(opt.value) && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {authorizationForm.recordTypes.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          已选: {authorizationForm.recordTypes.map(t => getRecordTypeLabel(t)).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      说明
                    </label>
                    <textarea
                      value={authorizationForm.description}
                      onChange={(e) => setAuthorizationForm({ ...authorizationForm, description: e.target.value })}
                      placeholder="请输入授权说明"
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      有效期至
                    </label>
                    <input
                      type="date"
                      value={authorizationForm.expiry_date}
                      onChange={(e) => setAuthorizationForm({ ...authorizationForm, expiry_date: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddAuthorization}
                      className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
