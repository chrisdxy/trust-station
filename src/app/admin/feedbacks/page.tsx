"use client";
import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../AdminLayout';
import { MessageSquare, ThumbsUp, Loader2, CheckCircle, Clock, AlertCircle, Search, X, ChevronDown, Reply, Eye, Shield, User, Send } from 'lucide-react';

interface FeedbackItem {
  id: string; user_id: string; user_name: string;
  type: 'complaint' | 'suggestion';
  content: string; status: 'pending' | 'read' | 'resolved';
  admin_reply?: string; created_at: string;
  parent_id?: string;
}

export default function AdminFeedbacksPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'complaint' | 'suggestion'>('all');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [followUps, setFollowUps] = useState<Record<string, FeedbackItem[]>>({});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('type', activeTab);
      const res = await fetch(`/api/feedbacks?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setUnreadCounts(data.unreadCounts || {});
      }
    } catch {}
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/feedbacks', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    fetchItems();
  };

  const unreadTotal = (unreadCounts.complaint || 0) + (unreadCounts.suggestion || 0);

  // 加载跟进回复
  const fetchFollowUps = async (parentId: string) => {
    try {
      const res = await fetch(`/api/feedbacks?parentId=${parentId}`);
      const data = await res.json();
      if (data.success) setFollowUps(prev => ({ ...prev, [parentId]: data.items || [] }));
    } catch {}
  };

  // 管理员回复（使用跟进方式）
  const handleAdminReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    const adminId = 'admin';
    setSaving(true);
    try {
      await fetch('/api/feedbacks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: adminId, userName: '管理员', content: replyText.trim(), parentId })
      });
      // 同时标记为已解决
      await fetch('/api/feedbacks', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parentId, status: 'resolved' })
      });
      setReplyingId(null);
      setReplyText('');
      fetchFollowUps(parentId);
      fetchItems();
    } catch {}
    finally { setSaving(false); }
  };

  // 展开时加载跟进

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded"><Clock className="w-3 h-3" />待处理</span>;
      case 'read': return <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"><Eye className="w-3 h-3" />已读</span>;
      case 'resolved': return <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"><CheckCircle className="w-3 h-3" />已解决</span>;
      default: return null;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">投诉与建议</h1>
            <p className="text-sm text-slate-500">管理用户提交的投诉与建议</p>
          </div>
          {unreadTotal > 0 && (
            <span className="ml-auto px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
              待处理: {unreadTotal}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'all', label: '全部', count: 0 },
            { key: 'complaint', label: '投诉', count: unreadCounts.complaint || 0 },
            { key: 'suggestion', label: '建议', count: unreadCounts.suggestion || 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? tab.key === 'complaint' ? 'bg-red-500 text-white' : tab.key === 'suggestion' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.key === 'complaint' && <ThumbsUp className="w-4 h-4 rotate-180" />}
              {tab.key === 'suggestion' && <ThumbsUp className="w-4 h-4" />}
              {tab.label}
              {tab.count > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">暂无数据</div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          item.type === 'complaint' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {item.type === 'complaint' ? '投诉' : '建议'}
                        </span>
                        {statusBadge(item.status)}
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                        {item.user_name || item.user_id}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{item.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleString('zh-CN')}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.status === 'pending' && (
                        <button onClick={() => handleStatusChange(item.id, 'read')} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="标记已读">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setReplyingId(replyingId === item.id ? null : item.id); setReplyText(item.admin_reply || ''); }}
                        className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg"
                        title="回复"
                      >
                        <Reply className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setExpandedId(expandedId === item.id ? null : item.id); if (expandedId !== item.id) fetchFollowUps(item.id); }}
                        className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {expandedId === item.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{item.content}</p>
                      {/* 管理员第一次回复 */}
                      {item.admin_reply && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                            <Shield className="w-3 h-3" />管理员回复
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{item.admin_reply}</p>
                        </div>
                      )}
                      {/* 用户跟进回复（从 API 加载） */}
                      {followUps[item.id]?.map(fu => (
                        <div key={fu.id} className={`p-3 rounded-xl ${fu.user_id === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                          <p className="text-xs font-medium mb-1 flex items-center gap-1">
                            {fu.user_id === 'admin' ? <><Shield className="w-3 h-3 text-blue-600" /><span className="text-blue-600">管理员</span></> : <><User className="w-3 h-3 text-amber-600" /><span className="text-amber-600">{fu.user_name || '用户'}</span></>}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{fu.content}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(fu.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {replyingId === item.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="输入回复内容..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setReplyingId(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">取消</button>
                        <button
                          onClick={() => handleAdminReply(item.id)}
                          disabled={saving || !replyText.trim()}
                          className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg flex items-center gap-1"
                        >
                          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                          回复并解决
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
