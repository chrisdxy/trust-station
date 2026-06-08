"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, CheckCircle, PauseCircle, StopCircle, Loader2, Shield } from 'lucide-react';

interface PublicRecord {
  id: number;
  record_id: string;
  applicant_id: string;
  applicant_name?: string;
  public_person_id: string;
  public_person_name?: string;
  public_person_phone?: string;
  public_person_display_name?: string;
  record_type: string;
  title: string;
  content?: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function AdminPublicRecordsPage() {
  const [records, setRecords] = useState<PublicRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/public-records?status=${filter}&limit=100`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch (e) {
      console.error('获取列表失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setActionLoading(id);
    try {
      const res = await fetch('/api/admin/public-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchRecords();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (e) {
      console.error('操作失败:', e);
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">待审核</span>;
      case 'approved': return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">已公开</span>;
      case 'paused': return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">已暂停</span>;
      case 'stopped': return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">已停止</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-500">{status}</span>;
    }
  };

  const getRecordTypeLabel = (type: string) => {
    const map: Record<string, string> = { '99': '纯善建议', '100': '合约沟通', '102': '维权沟通', '124': '求同存异', '125': '协调记录', '129': '改过责善' };
    return map[type] || type || '其他';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-indigo-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">公开记录管理</h1>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'all', label: '全部' },
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已公开' },
          { value: 'paused', label: '已暂停' },
          { value: 'stopped', label: '已停止' }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-indigo-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p>暂无公开记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((pr, idx) => (
            <motion.div
              key={pr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getStatusBadge(pr.status)}
                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                      {getRecordTypeLabel(pr.record_type)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{pr.title || '无标题'}</h3>
                  {pr.content && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {pr.content.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 flex-wrap">
                    <span>申请人：{pr.applicant_name || pr.applicant_id?.slice(0, 12)}</span>
                    <span>被公开人：{pr.public_person_display_name || pr.public_person_name || pr.public_person_id?.slice(0, 12)}</span>
                    {pr.public_person_phone && <span>手机：{pr.public_person_phone}</span>}
                  </div>
                  {pr.description && (
                    <p className="text-xs text-slate-400 mt-2">说明：{pr.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    更新于 {pr.updated_at ? new Date(pr.updated_at).toLocaleString() : ''}
                  </p>
                </div>

                {/* 操作按钮 */}
                <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                  {pr.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(pr.id, 'approved')}
                      disabled={actionLoading === pr.id}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === pr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      同意公开
                    </button>
                  )}
                  {pr.status === 'approved' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(pr.id, 'paused')}
                        disabled={actionLoading === pr.id}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading === pr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PauseCircle className="w-3.5 h-3.5" />}
                        暂停公开
                      </button>
                      <button
                        onClick={() => handleStatusChange(pr.id, 'stopped')}
                        disabled={actionLoading === pr.id}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading === pr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                        停止公开
                      </button>
                    </>
                  )}
                  {pr.status === 'paused' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(pr.id, 'approved')}
                        disabled={actionLoading === pr.id}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        {actionLoading === pr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        恢复公开
                      </button>
                      <button
                        onClick={() => handleStatusChange(pr.id, 'stopped')}
                        disabled={actionLoading === pr.id}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        <StopCircle className="w-3.5 h-3.5" />
                        停止公开
                      </button>
                    </>
                  )}
                  {pr.status === 'stopped' && (
                    <button
                      onClick={() => handleStatusChange(pr.id, 'approved')}
                      disabled={actionLoading === pr.id}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === pr.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      重新公开
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
