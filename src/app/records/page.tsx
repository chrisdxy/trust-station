"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, X, Loader2, Calendar, MessageSquare, AlertCircle, Scale } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface RecordItem {
  id: string;
  title: string;
  content?: string;
  record_type?: string;
  tags?: string;
  visibility?: string;
  related_items?: RelatedItem[];
  related_parties?: RelatedParty[];
  likes_count?: number;
  comments_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface RelatedItem {
  type: 'community' | 'project' | 'cooperation' | 'activity' | 'record';
  id: string;
  title: string;
}

interface RelatedParty {
  id: string;
  name: string;
  sourceType: 'community' | 'project' | 'cooperation' | 'activity' | 'record';
  sourceId: string;
  sourceTitle: string;
}

interface RecordCategory {
  id: string;
  name: string;
}

// 硬编码兜底分类（当后台无 record_type 分类时使用）
const defaultCategories: RecordCategory[] = [
  { id: 'insight', name: '认知记录' },
  { id: 'learning', name: '学习记录' },
  { id: 'reflection', name: '反思记录' },
  { id: 'achievement', name: '成就记录' },
];

// 分类颜色映射（基于 id 前缀或已知 id）
const typeColorMap: Record<string, { bg: string; text: string }> = {
  insight: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  learning: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  reflection: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  achievement: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

const typeIcons: Record<string, React.ReactNode> = {
  insight: <MessageSquare className="w-5 h-5 text-blue-500" />,
  learning: <FileText className="w-5 h-5 text-green-500" />,
  reflection: <AlertCircle className="w-5 h-5 text-amber-500" />,
  achievement: <Scale className="w-5 h-5 text-purple-500" />,
};

export default function RecordsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  // 动态分类：优先用后台 record_type，无则用硬编码兜底
  const [recordCategories, setRecordCategories] = useState<RecordCategory[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    recordType: 'insight',
    tags: '',
    visibility: 'private',
    relatedItems: [] as RelatedItem[],
    relatedParties: [] as RelatedParty[],
  });
  const [saving, setSaving] = useState(false);

  // 从后台获取记录分类（与 record_type 打通）
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?type=record_type');
      const data = await res.json();
      if (data.success && data.categories?.length > 0) {
        setRecordCategories(data.categories);
        setFormData(f => ({ ...f, recordType: data.categories[0].id }));
      } else {
        setRecordCategories(defaultCategories);
        setFormData(f => ({ ...f, recordType: 'insight' }));
      }
    } catch {
      setRecordCategories(defaultCategories);
      setFormData(f => ({ ...f, recordType: 'insight' }));
    }
  };

  // 获取记录列表
  const fetchRecords = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id });
      if (filterType) params.set('type', filterType);
      const response = await fetch(`/api/records?${params}`);
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('获取记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取分类名
  const getCategoryName = (id?: string) => {
    if (!id) return '未知';
    return recordCategories.find(c => c.id === id)?.name
      || defaultCategories.find(c => c.id === id)?.name
      || id;
  };

  // 获取分类颜色
  const getCategoryColor = (id?: string) => {
    return typeColorMap[id || ''] || { bg: 'bg-slate-50 dark:bg-slate-800', text: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  };

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchRecords();
    }
  }, [user, filterType]);

  const handleAdd = async () => {
    if (!user?.id || !formData.title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: formData.title,
          content: formData.content,
          recordType: formData.recordType,
          tags: formData.tags,
          visibility: formData.visibility,
          related_items: formData.relatedItems,
          related_parties: formData.relatedParties,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ title: '', content: '', recordType: recordCategories[0]?.id || 'insight', tags: '', visibility: 'private', relatedItems: [], relatedParties: [] });
        fetchRecords();
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建记录失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      const response = await fetch(`/api/records?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchRecords();
      }
    } catch (error) {
      console.error('删除记录失败:', error);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch = !searchTerm ||
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || r.record_type === filterType;
    return matchesSearch && matchesType;
  });

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">请先登录</h2>
            <p className="text-slate-500">登录后可查看和管理您的认知留痕</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t('records') || '认知留痕'}</h1>
                <p className="text-white/80">记录您的思考与成长</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                写记录
              </button>
            </div>
          </div>
        </div>

        {/* 筛选 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索记录..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            >
              <option value="">全部类型</option>
              {recordCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 列表 */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无记录</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-emerald-600 hover:text-emerald-700"
              >
                点击写下第一条记录
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record, index) => {
                const color = getCategoryColor(record.record_type);
                const icon = typeIcons[record.record_type || ''] || <FileText className="w-5 h-5 text-slate-500" />;
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${color.bg}`}>
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                              {record.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${color.text}`}>
                                {getCategoryName(record.record_type)}
                              </span>
                              <span className="text-sm text-slate-500">
                                {record.visibility === 'public' ? '公开' : record.visibility === 'shared' ? '部分可见' : '私密'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(record.id);
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        {record.content && (
                          <p className="mt-2 text-slate-600 dark:text-slate-400 line-clamp-2">
                            {record.content}
                          </p>
                        )}
                        {record.tags && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {record.tags.split(',').map((tag, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                          {record.created_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(record.created_at).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 添加弹窗 */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">写记录</h3>
                  <button onClick={() => setShowAddModal(false)}>
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
                      value={formData.title}
                      onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="记录标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      分类
                    </label>
                    <select
                      value={formData.recordType}
                      onChange={(e) => setFormData(f => ({ ...f, recordType: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                    >
                      {recordCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* 关联事项 - 放在类型之后、内容之前 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      关联事项
                    </label>
                    <div className="space-y-2">
                      {formData.relatedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.type === 'community' ? 'bg-blue-100 text-blue-700' : item.type === 'project' ? 'bg-green-100 text-green-700' : item.type === 'cooperation' ? 'bg-amber-100 text-amber-700' : item.type === 'record' ? 'bg-rose-100 text-rose-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.type === 'community' ? '共同体' : item.type === 'project' ? '项目' : item.type === 'cooperation' ? '合作' : item.type === 'record' ? '认知留痕' : '活动'}
                          </span>
                          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{item.title}</span>
                          <button onClick={() => setFormData(f => ({...f, relatedItems: f.relatedItems.filter((_, i) => i !== idx), relatedParties: f.relatedParties.filter(p => p.sourceId !== item.id)}))} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={async () => {
                          const res = await fetch('/api/communities?userId=' + user?.id);
                          const data = await res.json();
                          const items = data.communities || [];
                          if (!items.length) { alert('暂无共同体，请先创建'); return; }
                          const titles = items.map((it: any) => it.name).join('\n');
                          const choice = prompt('选择共同体（输入名称）：\n' + titles);
                          const found = items.find((it: any) => it.name === choice);
                          if (found) setFormData(f => ({...f, relatedItems: [...f.relatedItems, {type: 'community', id: found.id, title: found.name}]}));
                        }} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700">共同体</button>
                        <button onClick={async () => {
                          const res = await fetch('/api/projects?userId=' + user?.id);
                          const data = await res.json();
                          const items = data.projects || [];
                          if (!items.length) { alert('暂无项目，请先创建'); return; }
                          const titles = items.map((it: any) => it.title).join('\n');
                          const choice = prompt('选择项目（输入名称）：\n' + titles);
                          const found = items.find((it: any) => it.title === choice);
                          if (found) setFormData(f => ({...f, relatedItems: [...f.relatedItems, {type: 'project', id: found.id, title: found.title}]}));
                        }} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700">项目</button>
                        <button onClick={async () => {
                          const res = await fetch('/api/mediations?userId=' + user?.id);
                          const data = await res.json();
                          const items = data.mediations || [];
                          if (!items.length) { alert('暂无合作事项，请先创建'); return; }
                          const titles = items.map((it: any) => it.name || it.title).join('\n');
                          const choice = prompt('选择合作事项（输入名称）：\n' + titles);
                          const found = items.find((it: any) => (it.name || it.title) === choice);
                          if (found) setFormData(f => ({...f, relatedItems: [...f.relatedItems, {type: 'cooperation', id: found.id, title: found.name || found.title}]}));
                        }} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700">合作</button>
                        <button onClick={async () => {
                          const res = await fetch('/api/activities?userId=' + user?.id);
                          const data = await res.json();
                          const items = data.activities || [];
                          if (!items.length) { alert('暂无活动，请先创建'); return; }
                          const titles = items.map((it: any) => it.title).join('\n');
                          const choice = prompt('选择活动（输入名称）：\n' + titles);
                          const found = items.find((it: any) => it.title === choice);
                          if (found) setFormData(f => ({...f, relatedItems: [...f.relatedItems, {type: 'activity', id: found.id, title: found.title}]}));
                        }} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700">活动</button>
                        <button onClick={async () => {
                          const kw = prompt('输入关键词搜索认知留痕：');
                          if (!kw || !kw.trim()) return;
                          const res = await fetch('/api/records?userId=' + user?.id + '&keyword=' + encodeURIComponent(kw.trim()));
                          const data = await res.json();
                          const items = data.records || [];
                          if (!items.length) { alert('未找到匹配的认知留痕'); return; }
                          const titles = items.map((it: any) => it.title + (it.content ? ' - ' + it.content.substring(0, 30) : '')).join('\n');
                          const choice = prompt('选择要关联的认知留痕（输入标题）：\n' + titles);
                          const found = items.find((it: any) => it.title === choice);
                          if (found) setFormData(f => ({...f, relatedItems: [...f.relatedItems, {type: 'record', id: found.id, title: found.title}]}));
                        }} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-slate-700 bg-amber-50 dark:bg-amber-900/20">🔍 搜索认知留痕</button>
                      </div>
                    </div>
                  </div>
                  {/* 相关方 - 从关联事项中选择成员 */}
                  {formData.relatedItems.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        相关方（从关联事项中选择成员）
                      </label>
                      <div className="space-y-2">
                        {formData.relatedParties.map((party, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{party.name}</span>
                            <span className="text-xs text-slate-400">{party.sourceTitle}</span>
                            <button onClick={() => setFormData(f => ({...f, relatedParties: f.relatedParties.filter((_, i) => i !== idx)}))} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <button onClick={async () => {
                          for (const item of formData.relatedItems) {
                            let members: any[] = [];
                            try {
                              if (item.type === 'community') {
                                const res = await fetch('/api/communities/' + item.id);
                                const d = await res.json();
                                members = d.community?.memberList || [];
                              } else if (item.type === 'project') {
                                const res = await fetch('/api/projects/' + item.id);
                                const d = await res.json();
                                members = d.project?.members || [];
                              }
                              if (members.length) {
                                const names = members.map((m: any) => m.name).join('\n');
                                const choice = prompt('从「' + item.title + '」选择成员：\n' + names);
                                const found = members.find((m: any) => m.name === choice);
                                if (found && !formData.relatedParties.find(p => p.id === found.id)) {
                                  setFormData(f => ({...f, relatedParties: [...f.relatedParties, {id: found.id || found.name, name: found.name, sourceType: item.type, sourceId: item.id, sourceTitle: item.title}]}));
                                }
                              }
                            } catch (e) { console.error(e); }
                          }
                        }} className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700">+ 添加相关方</button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      内容
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={5}
                      placeholder="记录内容..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      标签（用逗号分隔）
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="标签1, 标签2, 标签3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      可见性
                    </label>
                    <select
                      value={formData.visibility}
                      onChange={(e) => setFormData(f => ({ ...f, visibility: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                    >
                      <option value="private">仅自己可见</option>
                      <option value="shared">部分可见</option>
                      <option value="public">公开</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={saving || !formData.title.trim()}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 详情弹窗 */}
        <AnimatePresence>
          {showDetailModal && selectedRecord && (
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
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedRecord.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium mt-1 inline-block ${getCategoryColor(selectedRecord.record_type).text}`}>
                      {getCategoryName(selectedRecord.record_type)}
                    </span>
                  </div>
                  <button onClick={() => setShowDetailModal(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                {selectedRecord.content && (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {selectedRecord.content}
                    </p>
                  </div>
                )}
                {selectedRecord.tags && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedRecord.tags.split(',').map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
                {selectedRecord.created_at && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                    创建于 {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
