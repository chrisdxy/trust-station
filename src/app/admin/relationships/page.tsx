"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Plus, CheckCircle, Clock, AlertTriangle, Loader2, X, Eye } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { useRouter } from 'next/navigation';

interface Relationship {
  id: string;
  title: string;
  serial_number: string;
  relationship_type: string;
  status: string;
  creator_id: string;
  creator_name?: string;
  participant_ids: string;
  description?: string;
  created_at?: string;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  disputed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ended: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="w-4 h-4" />,
  pending: <Clock className="w-4 h-4" />,
  disputed: <AlertTriangle className="w-4 h-4" />,
  ended: <FileText className="w-4 h-4" />,
};

const statusLabels: Record<string, string> = {
  active: '进行中',
  pending: '待审核',
  disputed: '存在分歧',
  ended: '已结束',
};

export default function RelationshipsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);

  useEffect(() => {
    // 检查管理员登录状态
    const adminSession = localStorage.getItem('admin_session');
    if (!adminSession) {
      router.push('/admin/login');
      return;
    }
    setIsAdmin(true);
    fetchRelationships();
  }, []);

  const fetchRelationships = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      
      const response = await fetch(`/api/relationships?${params}`);
      const data = await response.json();
      if (data.success) {
        setRelationships(data.relationships || []);
      }
    } catch (error) {
      console.error('获取关系失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/relationships`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        fetchRelationships();
      }
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const filteredRelationships = relationships.filter((r) => {
    const matchesSearch = !searchTerm || 
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            关系管理
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            共 {relationships.length} 条合作关系
          </p>
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
              placeholder="搜索关系标题或编号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
          >
            <option value="">全部状态</option>
            <option value="active">进行中</option>
            <option value="pending">待审核</option>
            <option value="disputed">存在分歧</option>
            <option value="ended">已结束</option>
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
          ) : filteredRelationships.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无合作关系</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      关系编号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      创建者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredRelationships.map((rel) => (
                    <tr key={rel.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">
                          {rel.serial_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {rel.title}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {rel.relationship_type === 'business' ? '商业' :
                           rel.relationship_type === 'investment' ? '投资' :
                           rel.relationship_type === 'partnership' ? '合伙' :
                           rel.relationship_type === 'employment' ? '雇佣' : rel.relationship_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[rel.status] || statusColors.pending}`}>
                          {statusIcons[rel.status] || statusIcons.pending}
                          {statusLabels[rel.status] || '未知'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {rel.creator_name || rel.creator_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-slate-500">
                          {rel.created_at ? new Date(rel.created_at).toLocaleDateString('zh-CN') : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRelationship(rel);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {rel.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(rel.id, 'active')}
                              className="p-1.5 text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="审核通过"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
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
        {showDetailModal && selectedRelationship && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">关系详情</h3>
                <button onClick={() => setShowDetailModal(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                  <p className="text-sm text-slate-500 mb-1">关系编号</p>
                  <p className="font-mono font-medium">{selectedRelationship.serial_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">标题</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedRelationship.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">类型</p>
                    <p>{selectedRelationship.relationship_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">状态</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedRelationship.status]}`}>
                      {statusLabels[selectedRelationship.status]}
                    </span>
                  </div>
                </div>
                {selectedRelationship.description && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">描述</p>
                    <p className="text-slate-700 dark:text-slate-300">{selectedRelationship.description}</p>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500">
                  创建时间: {selectedRelationship.created_at ? new Date(selectedRelationship.created_at).toLocaleString('zh-CN') : '-'}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
