"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Search, Plus, X, Loader2, Shield, CheckCircle, Clock, XCircle, Mail, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

interface Authorization {
  id: string;
  grantee_email: string;
  grantee_name: string;
  scope: string;
  status: string;
  description: string;
  expiry_date?: string;
  relationship_title?: string;
  created_at?: string;
}

const scopeOptions = [
  { value: 'records', label: '关系记录', color: 'blue' },
  { value: 'mediation', label: '协调记录', color: 'amber' },
  { value: 'mindset', label: '心性档案', color: 'green' },
  { value: 'all', label: '全部权限', color: 'purple' },
];

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  granted: { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: '已授权' },
  pending: { icon: <Clock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: '待确认' },
  expired: { icon: <XCircle className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', label: '已过期' },
  revoked: { icon: <XCircle className="w-4 h-4" />, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: '已撤销' },
};

export default function AuthorizationPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState<Authorization | null>(null);
  const [formData, setFormData] = useState({
    granteeEmail: '',
    granteeName: '',
    scope: 'records',
    description: '',
    expiryDate: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAuthorizations();
    }
  }, [user, filterStatus]);

  const fetchAuthorizations = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId: user.id });
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`/api/authorizations?${params}`);
      const data = await response.json();
      if (data.success) {
        setAuthorizations(data.authorizations || []);
      }
    } catch (error) {
      console.error('获取授权失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!user?.id || !formData.granteeEmail.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantorId: user.id,
          granteeEmail: formData.granteeEmail,
          granteeName: formData.granteeName,
          scope: formData.scope,
          description: formData.description,
          expiryDate: formData.expiryDate,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowGrantModal(false);
        setFormData({ granteeEmail: '', granteeName: '', scope: 'records', description: '', expiryDate: '' });
        fetchAuthorizations();
      }
    } catch (error) {
      console.error('创建授权失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确定要撤销此授权吗？')) return;
    try {
      const response = await fetch('/api/authorizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'revoked' }),
      });
      const data = await response.json();
      if (data.success) {
        fetchAuthorizations();
      }
    } catch (error) {
      console.error('撤销授权失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此授权记录吗？')) return;
    try {
      const response = await fetch(`/api/authorizations?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchAuthorizations();
      }
    } catch (error) {
      console.error('删除授权失败:', error);
    }
  };

  const filteredAuthorizations = authorizations.filter((a) => {
    const matchesSearch = !searchTerm || 
      a.grantee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.grantee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (!user) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">请先登录</h2>
            <p className="text-slate-500">登录后可管理您的授权</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">授权管理</h1>
                <p className="text-white/80">管理您对他人的信息访问授权</p>
              </div>
              <button
                onClick={() => setShowGrantModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-violet-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                授予授权
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
                placeholder="搜索被授权人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            >
              <option value="">全部状态</option>
              <option value="granted">已授权</option>
              <option value="pending">待确认</option>
              <option value="expired">已过期</option>
              <option value="revoked">已撤销</option>
            </select>
          </div>
        </div>

        {/* 列表 */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filteredAuthorizations.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Key className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无授权记录</p>
              <button
                onClick={() => setShowGrantModal(true)}
                className="mt-4 text-violet-600 hover:text-violet-700"
              >
                点击授予第一条授权
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAuthorizations.map((auth, index) => {
                const status = statusConfig[auth.status] || statusConfig.pending;
                return (
                  <motion.div
                    key={auth.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedAuth(auth);
                      setShowDetailModal(true);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                          <Shield className="w-5 h-5 text-violet-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {auth.grantee_name || auth.grantee_email}
                            </h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.icon}
                              {status.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{auth.grantee_email}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              auth.scope === 'records' ? 'bg-blue-100 text-blue-700' :
                              auth.scope === 'mediation' ? 'bg-amber-100 text-amber-700' :
                              auth.scope === 'mindset' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {scopeOptions.find(s => s.value === auth.scope)?.label || auth.scope}
                            </span>
                            {auth.relationship_title && (
                              <span className="text-xs text-slate-400">关联: {auth.relationship_title}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {auth.expiry_date && (
                          <span className="text-sm text-slate-500">
                            有效期至: {new Date(auth.expiry_date).toLocaleDateString('zh-CN')}
                          </span>
                        )}
                        {auth.status === 'granted' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevoke(auth.id);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="撤销授权"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(auth.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {auth.description && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 pl-[72px]">
                        {auth.description}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 授权弹窗 */}
        <AnimatePresence>
          {showGrantModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowGrantModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">授予授权</h3>
                  <button onClick={() => setShowGrantModal(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      被授权人邮箱 *
                    </label>
                    <input
                      type="email"
                      value={formData.granteeEmail}
                      onChange={(e) => setFormData(f => ({ ...f, granteeEmail: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="对方邮箱地址"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      被授权人姓名
                    </label>
                    <input
                      type="text"
                      value={formData.granteeName}
                      onChange={(e) => setFormData(f => ({ ...f, granteeName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      placeholder="对方姓名（选填）"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      授权范围
                    </label>
                    <select
                      value={formData.scope}
                      onChange={(e) => setFormData(f => ({ ...f, scope: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                    >
                      {scopeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      有效期至
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(f => ({ ...f, expiryDate: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      授权说明
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                      rows={3}
                      placeholder="简要说明授权内容..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowGrantModal(false)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleGrant}
                      disabled={saving || !formData.granteeEmail.trim()}
                      className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? '提交中...' : '确认授权'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 详情弹窗 */}
        <AnimatePresence>
          {showDetailModal && selectedAuth && (
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
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">授权详情</h3>
                  <button onClick={() => setShowDetailModal(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <Shield className="w-8 h-8 text-violet-500" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedAuth.grantee_name || selectedAuth.grantee_email}
                      </p>
                      <p className="text-sm text-slate-500">{selectedAuth.grantee_email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">授权范围</p>
                      <p className="font-medium">{scopeOptions.find(s => s.value === selectedAuth.scope)?.label}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">授权状态</p>
                      <p className="font-medium">{statusConfig[selectedAuth.status]?.label}</p>
                    </div>
                    {selectedAuth.expiry_date && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">有效期至</p>
                        <p className="font-medium">{new Date(selectedAuth.expiry_date).toLocaleDateString('zh-CN')}</p>
                      </div>
                    )}
                    {selectedAuth.created_at && (
                      <div>
                        <p className="text-sm text-slate-500 mb-1">创建时间</p>
                        <p className="font-medium">{new Date(selectedAuth.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                    )}
                  </div>
                  {selectedAuth.description && (
                    <div>
                      <p className="text-sm text-slate-500 mb-1">授权说明</p>
                      <p className="text-slate-700 dark:text-slate-300">{selectedAuth.description}</p>
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
