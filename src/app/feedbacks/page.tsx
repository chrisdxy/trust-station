"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ThumbsUp, Send, Clock, CheckCircle, X, AlertCircle, Loader2, ChevronDown, Reply, User, Shield } from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackItem {
  id: string; user_id: string; user_name: string;
  type: 'complaint' | 'suggestion';
  content: string; status: 'pending' | 'read' | 'resolved';
  admin_reply?: string; created_at: string;
  parent_id?: string; user_read?: number;
}

interface ThreadItem extends FeedbackItem {
  children: FeedbackItem[];
}

export default function FeedbacksPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'complaint' | 'suggestion'>('complaint');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'complaint' | 'suggestion'>('complaint');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpId, setFollowUpId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<Record<string, FeedbackItem[]>>({});

  // 标记所有为已读
  const markAsRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await fetch('/api/feedbacks', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRead: true, userId: user.id })
      });
    } catch {}
  }, [user?.id]);

  // 获取某个反馈的跟进
  const fetchFollowUps = async (parentId: string) => {
    try {
      const res = await fetch(`/api/feedbacks?parentId=${parentId}`);
      const data = await res.json();
      if (data.success) {
        setFollowUps(prev => ({ ...prev, [parentId]: data.items || [] }));
      }
    } catch {}
  };

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/feedbacks?userId=${user.id}&type=${activeTab}`);
      const data = await res.json();
      if (data.success) setItems(data.items || []);
      markAsRead();
    } catch {}
    finally { setLoading(false); }
  }, [user?.id, activeTab, markAsRead]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // 展开时加载跟进
  useEffect(() => {
    if (expandedId && !followUps[expandedId]) {
      fetchFollowUps(expandedId);
    }
  }, [expandedId]);

  const handleSubmit = async () => {
    if (!content.trim() || !user?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: (user as any).display_name || (user as any).real_name || '',
          type: formType,
          content: content.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        setContent('');
        setTimeout(() => { setShowForm(false); setSubmitSuccess(false); }, 1500);
        fetchItems();
      } else alert(data.error || '提交失败');
    } catch { alert('提交失败'); }
    finally { setSubmitting(false); }
  };

  // 提交跟进回复
  const handleFollowUp = async (parentId: string) => {
    if (!followUpText.trim() || !user?.id) return;
    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: (user as any).display_name || (user as any).real_name || '',
          content: followUpText.trim(),
          parentId
        })
      });
      const data = await res.json();
      if (data.success) {
        setFollowUpText('');
        setFollowUpId(null);
        fetchFollowUps(parentId);
        fetchItems();
      } else alert(data.error || '提交失败');
    } catch { alert('提交失败'); }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded"><Clock className="w-3 h-3" />待处理</span>;
      case 'read': return <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"><AlertCircle className="w-3 h-3" />已读</span>;
      case 'resolved': return <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"><CheckCircle className="w-3 h-3" />已解决</span>;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-amber-500" />
              投诉与建议
            </h1>
            <p className="text-sm text-slate-500 mt-1">您的反馈是我们进步的动力，可多次跟进沟通</p>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => { setFormType(activeTab); setShowForm(true); setSubmitSuccess(false); }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              提交{activeTab === 'complaint' ? '投诉' : '建议'}
            </button>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('complaint')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'complaint'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}>
            <ThumbsUp className="w-4 h-4 rotate-180" />投诉
          </button>
          <button onClick={() => setActiveTab('suggestion')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              activeTab === 'suggestion'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}>
            <ThumbsUp className="w-4 h-4" />建议
          </button>
        </div>

        {/* 提交表单弹窗 */}
        <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !submitting && setShowForm(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  提交{formType === 'complaint' ? '投诉' : '建议'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              {submitSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                  <p className="text-green-600 font-medium">提交成功！感谢您的反馈</p>
                </div>
              ) : (
                <>
                  <textarea value={content} onChange={e => setContent(e.target.value)}
                    placeholder={formType === 'complaint' ? '请描述您要投诉的内容...' : '请描述您的建议...'}
                    rows={6}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">取消</button>
                    <button onClick={handleSubmit} disabled={submitting || !content.trim()}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-xl text-sm font-medium flex items-center gap-2">
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}提交
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* 列表 */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">暂无{activeTab === 'complaint' ? '投诉' : '建议'}</p>
            {isAuthenticated && (
              <button onClick={() => { setFormType(activeTab); setShowForm(true); }}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm">
                提交第一条{activeTab === 'complaint' ? '投诉' : '建议'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => {
              const thread = followUps[item.id] || [];
              const hasAdminReply = !!item.admin_reply;
              const threadCount = thread.length;
              return (
                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                  {/* 主反馈 */}
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
                        <p className="text-sm text-slate-700 dark:text-slate-300">{item.content}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(item.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setFollowUpId(followUpId === item.id ? null : item.id); setFollowUpText(''); }}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg" title="继续沟通">
                          <Reply className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setExpandedId(expandedId === item.id ? null : item.id); if (expandedId !== item.id) fetchFollowUps(item.id); }}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* 跟进内容区域 */}
                    <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
                          {/* 管理员回复 */}
                          {hasAdminReply && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Shield className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">管理员回复</span>
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{item.admin_reply}</p>
                            </div>
                          )}

                          {/* 后续跟进 */}
                          {thread.map(fu => (
                            <div key={fu.id} className={`p-3 rounded-xl ${fu.user_id === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                {fu.user_id === 'admin' ? (
                                  <><Shield className="w-3.5 h-3.5 text-blue-600" /><span className="text-xs font-medium text-blue-600 dark:text-blue-400">管理员</span></>
                                ) : (
                                  <><User className="w-3.5 h-3.5 text-amber-600" /><span className="text-xs font-medium text-amber-600 dark:text-amber-400">{fu.user_name || '我'}</span></>
                                )}
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{fu.content}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{new Date(fu.created_at).toLocaleString('zh-CN')}</p>
                            </div>
                          ))}

                          {threadCount === 0 && !hasAdminReply && (
                            <p className="text-xs text-slate-400 text-center py-2">暂无回复，等待管理员处理</p>
                          )}
                        </div>

                        {/* 继续沟通输入框 */}
                        {followUpId === item.id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <textarea value={followUpText} onChange={e => setFollowUpText(e.target.value)}
                              placeholder="输入补充内容..."
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setFollowUpId(null)} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">取消</button>
                              <button onClick={() => handleFollowUp(item.id)} disabled={!followUpText.trim()}
                                className="px-3 py-1.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-white rounded-lg flex items-center gap-1">
                                <Send className="w-3 h-3" />发送
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 展开沟通入口 */}
                        {followUpId !== item.id && (
                          <button onClick={() => setFollowUpId(item.id)}
                            className="mt-2 text-xs text-amber-500 hover:text-amber-600 flex items-center gap-1">
                            <Reply className="w-3 h-3" />继续沟通
                          </button>
                        )}
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400">遇到紧急情况可致电 18221337054</p>
        </div>
      </div>
    </Layout>
  );
}
