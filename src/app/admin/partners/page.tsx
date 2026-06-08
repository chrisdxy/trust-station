"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Eye, Clock, CheckCircle, XCircle, Search, Loader2, FileText, X as XIcon } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { useRouter } from 'next/navigation';

interface PartnerApplication {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  partner_level: string;
  region?: string;
  business_plan?: string;
  status: string;
  submitted_at?: string;
  reviewed_at?: string;
  reviewer?: string;
  review_note?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  approved: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />
};

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
};

export default function PartnersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<PartnerApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    // 检查管理员登录状态
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      router.push('/admin/login');
      return;
    }
    setIsAdmin(true);
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`/api/admin/partners?${params}`);
      const data = await response.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('获取申请失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/admin/partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reviewNote })
      });
      const data = await response.json();
      if (data.success) {
        setShowReviewModal(false);
        setReviewNote('');
        setSelectedApp(null);
        fetchApplications();
      }
    } catch (error) {
      console.error('审核失败:', error);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      app.user_name?.toLowerCase().includes(term) ||
      app.user_phone?.includes(term) ||
      app.partner_level?.toLowerCase().includes(term)
    );
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                合伙人审核
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                待审核 {pendingCount} 条申请
              </p>
            </div>
          </div>
        </motion.div>

        {/* 筛选 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex items-center gap-4"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索申请人..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          >
            <option value="">全部状态</option>
            <option value="pending">待审核</option>
            <option value="approved">已通过</option>
            <option value="rejected">已拒绝</option>
          </select>
        </motion.div>

        {/* 列表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无申请记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      申请人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      合伙人级别
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      地区
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      申请时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredApplications.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {app.user_name || '未知'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {app.user_phone || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
                          {app.partner_level === 'business' ? '事业合伙人' :
                           app.partner_level === 'regional' ? '城市合伙人' : app.partner_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {app.region || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[app.status]}`}>
                          {statusIcons[app.status]}
                          {statusLabels[app.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-500">
                          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('zh-CN') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowReviewModal(true);
                                  setReviewNote('');
                                }}
                                className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="通过"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedApp(app);
                                  setShowReviewModal(true);
                                  setReviewNote('不符合要求');
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="拒绝"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* 详情弹窗 */}
        {showDetailModal && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">申请详情</h3>
                <button onClick={() => setShowDetailModal(false)}>
                  <XIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">申请人</p>
                    <p className="font-medium">{selectedApp.user_name || '未知'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">手机号</p>
                    <p className="font-medium">{selectedApp.user_phone || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">合伙人级别</p>
                    <p className="font-medium">
                      {selectedApp.partner_level === 'business' ? '事业合伙人' :
                       selectedApp.partner_level === 'regional' ? '城市合伙人' : selectedApp.partner_level}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">地区</p>
                    <p className="font-medium">{selectedApp.region || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">商业计划</p>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {selectedApp.business_plan || '暂无商业计划'}
                    </p>
                  </div>
                </div>
                {selectedApp.review_note && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-600 mb-1 font-medium">审核备注</p>
                    <p className="text-slate-700 dark:text-slate-300">{selectedApp.review_note}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                  <p>申请时间: {selectedApp.submitted_at ? new Date(selectedApp.submitted_at).toLocaleString('zh-CN') : '-'}</p>
                  {selectedApp.reviewed_at && (
                    <p>审核时间: {new Date(selectedApp.reviewed_at).toLocaleString('zh-CN')}</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* 审核弹窗 */}
        {showReviewModal && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReviewModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">审核申请</h3>
                <button onClick={() => setShowReviewModal(false)}>
                  <XIcon className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <p className="font-medium text-slate-900 dark:text-white">{selectedApp.user_name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedApp.partner_level === 'business' ? '事业合伙人' :
                   selectedApp.partner_level === 'regional' ? '城市合伙人' : selectedApp.partner_level}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  审核备注
                </label>
                <textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900"
                  rows={3}
                  placeholder="输入审核备注..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => handleReview(selectedApp.id, 'rejected')}
                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium"
                >
                  拒绝
                </button>
                <button
                  onClick={() => handleReview(selectedApp.id, 'approved')}
                  className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium"
                >
                  通过
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
