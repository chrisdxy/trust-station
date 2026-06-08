"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, UserX, MessageSquare, Clock, ChevronRight, Bell } from 'lucide-react';
import Layout from '@/components/Layout';

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  message: string;
  created_at: string;
  display_name: string;
  real_name: string;
  avatar_url: string;
  user_type: string;
  bio: string;
  identity_verified: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'notifications'>('friends');

  const fetchRequests = async () => {
    if (!authUser?.id) return;
    try {
      const res = await fetch(`/api/friends?userId=${authUser.id}&type=received`);
      const data = await res.json();
      if (data.success) setRequests(data.requests || []);
    } catch (err) {
      console.error('获取好友申请失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const timer = setInterval(fetchRequests, 15000);
    return () => clearInterval(timer);
  }, [authUser?.id]);

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/friends/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: authUser?.id })
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (err) {
      console.error('处理申请失败:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getDisplayName = (req: FriendRequest) => {
    return req.display_name || req.real_name || req.user_id?.replace('UID', '').slice(-4) || '用户';
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">消息中心</h1>
            <p className="text-sm text-slate-500 mt-1">好友申请与系统通知</p>
          </div>

          {/* 标签切换 */}
          <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'friends'
                  ? 'bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <UserCheck size={16} />
              好友申请
              {requests.length > 0 && (
                <span className="min-w-[18px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {requests.length > 99 ? '99+' : requests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'notifications'
                  ? 'bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Bell size={16} />
              系统通知
            </button>
          </div>

          {/* 好友申请列表 */}
          {activeTab === 'friends' && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-slate-400">加载中...</div>
              ) : requests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <UserCheck className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">暂无好友申请</p>
                  <p className="text-xs text-slate-400 mt-1">当有人添加你为好友时，会在这里显示</p>
                </motion.div>
              ) : (
                requests.map((req, idx) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-4">
                      {/* 头像 */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {req.avatar_url ? (
                          <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-semibold text-sm">{getDisplayName(req)[0]}</span>
                        )}
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-slate-900 dark:text-white text-sm truncate">
                            {getDisplayName(req)}
                          </h3>
                          {req.identity_verified === 1 && (
                            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] rounded">已认证</span>
                          )}
                          <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{formatTime(req.created_at)}</span>
                        </div>

                        {req.message && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                            留言：{req.message}
                          </p>
                        )}

                        {/* 操作按钮 */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAction(req.id, 'accept')}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors"
                          >
                            <UserCheck size={14} />
                            同意
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'reject')}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs rounded-lg transition-colors"
                          >
                            <UserX size={14} />
                            拒绝
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* 系统通知 */}
          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">暂无系统通知</p>
              <p className="text-xs text-slate-400 mt-1">系统通知功能即将上线</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
