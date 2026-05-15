"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Filter, X, Loader2, Heart, CheckCircle, Clock, User } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Partner {
  id: string;
  partner_name?: string;
  partner_type?: string;
  relationship_type?: string;
  cooperation_level?: string;
  trust_score?: number;
  collaboration_history?: string;
  shared_projects?: string;
  notes?: string;
  status?: string;
  created_at?: string;
}

export default function RelationshipsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    partnerName: '',
    partnerType: 'individual',
    relationshipType: '',
    cooperationLevel: 'potential',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRelationships();
    }
  }, [user, filterLevel]);

  const fetchRelationships = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id });
      if (filterLevel) params.set('level', filterLevel);
      
      const response = await fetch(`/api/relationships?${params}`);
      const data = await response.json();
      if (data.success) {
        setRelationships(data.relationships || []);
      }
    } catch (error) {
      console.error('获取合作关系失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!user?.id || !addForm.partnerName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          partnerName: addForm.partnerName,
          partnerType: addForm.partnerType,
          relationshipType: addForm.relationshipType,
          cooperationLevel: addForm.cooperationLevel,
          notes: addForm.notes,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setAddForm({
          partnerName: '',
          partnerType: 'individual',
          relationshipType: '',
          cooperationLevel: 'potential',
          notes: '',
        });
        fetchRelationships();
      }
    } catch (error) {
      console.error('添加合作关系失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const getLevelLabel = (level?: string) => {
    const labels: Record<string, string> = {
      trusted: '已信任',
      verified: '已认证',
      potential: '潜在合作',
    };
    return labels[level || ''] || level || '未知';
  };

  const getLevelColor = (level?: string) => {
    const colors: Record<string, string> = {
      trusted: 'bg-green-100 text-green-700',
      verified: 'bg-blue-100 text-blue-700',
      potential: 'bg-amber-100 text-amber-700',
    };
    return colors[level || ''] || 'bg-gray-100 text-gray-700';
  };

  const getTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      individual: '个人',
      enterprise: '企业',
      expert: '专家',
    };
    return labels[type || ''] || type || '未知';
  };

  const filteredRelationships = relationships.filter(r => {
    const matchSearch = !searchTerm || 
      r.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">请先登录</h2>
            <p className="text-slate-500">登录后可查看和管理您的合作关系</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t('relationships') || '合作关系'}</h1>
                <p className="text-white/80">管理您的合作伙伴关系</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                添加合作
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
                placeholder="搜索合作伙伴..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            >
              <option value="">全部等级</option>
              <option value="trusted">已信任</option>
              <option value="verified">已认证</option>
              <option value="potential">潜在合作</option>
            </select>
          </div>
        </div>

        {/* 列表 */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : filteredRelationships.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无合作关系</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-purple-600 hover:text-purple-700"
              >
                点击添加第一个合作
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRelationships.map((rel, index) => (
                <motion.div
                  key={rel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {rel.partner_name || '未命名合作'}
                        </h3>
                        <span className="text-sm text-slate-500">
                          {getTypeLabel(rel.partner_type)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(rel.cooperation_level)}`}>
                      {getLevelLabel(rel.cooperation_level)}
                    </span>
                  </div>

                  {rel.relationship_type && (
                    <div className="text-sm text-slate-500 mb-2">
                      关系类型：{rel.relationship_type}
                    </div>
                  )}

                  {rel.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {rel.notes}
                    </p>
                  )}

                  {rel.trust_score !== undefined && rel.trust_score > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${rel.trust_score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {rel.trust_score}分
                      </span>
                    </div>
                  )}

                  {rel.created_at && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400">
                      创建于 {new Date(rel.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </motion.div>
              ))}
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
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加合作关系</h3>
                  <button onClick={() => setShowAddModal(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      合作伙伴名称 *
                    </label>
                    <input
                      type="text"
                      value={addForm.partnerName}
                      onChange={(e) => setAddForm(f => ({ ...f, partnerName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="请输入合作伙伴名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      合作方类型
                    </label>
                    <select
                      value={addForm.partnerType}
                      onChange={(e) => setAddForm(f => ({ ...f, partnerType: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                    >
                      <option value="individual">个人</option>
                      <option value="enterprise">企业</option>
                      <option value="expert">专家</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      合作关系类型
                    </label>
                    <input
                      type="text"
                      value={addForm.relationshipType}
                      onChange={(e) => setAddForm(f => ({ ...f, relationshipType: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="如：战略合作、项目合作"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      合作等级
                    </label>
                    <select
                      value={addForm.cooperationLevel}
                      onChange={(e) => setAddForm(f => ({ ...f, cooperationLevel: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                    >
                      <option value="potential">潜在合作</option>
                      <option value="verified">已认证</option>
                      <option value="trusted">已信任</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      备注
                    </label>
                    <textarea
                      value={addForm.notes}
                      onChange={(e) => setAddForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={3}
                      placeholder="备注信息（可选）"
                    />
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
                      disabled={saving || !addForm.partnerName.trim()}
                      className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? '添加中...' : '添加'}
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
