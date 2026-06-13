"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, User, Building, Award, Search, X, MapPin, Mail, Phone, Star, Shield, Loader2, UserPlus, Check, CheckCircle, XCircle, Clock, Users, Send, MessageSquare, Handshake, Briefcase, GraduationCap, Sparkles, TrendingUp } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

type CardType = 'personal' | 'enterprise' | 'expert' | 'coach' | 'partner';
type PageTab = 'browse' | 'requests' | 'friends';

interface UserCard {
  cardId: string;
  cardType: CardType;
  id: string; // user id
  display_name?: string;
  real_name?: string;
  user_type?: string;
  company_name?: string;
  avatar_url?: string;
  location?: string;
  identity_verified?: number;
  created_at?: string;
  // 名片字段
  bio?: string;
  expertise?: string;
  title?: string;
  email?: string;
  wechat?: string;
  cooperation?: string;
  industry?: string;
  experience?: string;
  education?: string;
  address?: string;
  cardFields?: Record<string, string>;
}

interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  message?: string;
  created_at: string;
  display_name?: string;
  real_name?: string;
  phone?: string;
  avatar_url?: string;
  user_type?: string;
  company_name?: string;
  bio?: string;
  expertise?: string;
  identity_verified?: number;
}

const typeIcons: Record<string, React.ReactNode> = {
  personal: <User className="w-5 h-5" />,
  enterprise: <Building className="w-5 h-5" />,
  expert: <Award className="w-5 h-5" />,
  coach: <TrendingUp className="w-5 h-5" />,
  partner: <Handshake className="w-5 h-5" />
};

const typeColors: Record<string, string> = {
  personal: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
  enterprise: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
  expert: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
  coach: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600',
  partner: 'bg-green-50 dark:bg-green-900/20 text-green-600'
};

const typeLabels: Record<string, string> = {
  personal: '个人',
  enterprise: '企业',
  expert: '专家',
  coach: '陪跑专家',
  partner: '合伙人'
};

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <PeopleContent />
    </Suspense>
  );
}

function PeopleContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'requests' ? 'requests' : 'browse';
  const [pageTab, setPageTab] = useState<PageTab>(initialTab);

  // 浏览伙伴 - 基于名片
  const [cards, setCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // 加好友申请相关
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [friendMessage, setFriendMessage] = useState('');
  const [sendingFriend, setSendingFriend] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState<'received' | 'sent'>('received');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendRequest[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [graphResult, setGraphResult] = useState('');
  const [graphLoading, setGraphLoading] = useState(false);

  // 获取好友清单
  const fetchFriends = useCallback(async () => {
    if (!user?.id) return;
    setFriendsLoading(true);
    try {
      const res = await fetch(`/api/friends?userId=${user.id}&type=friends`);
      const data = await res.json();
      if (data.success) setFriends(data.requests || []);
    } catch (error) {
      console.error('获取好友清单失败:', error);
    } finally {
      setFriendsLoading(false);
    }
  }, [user?.id]);

  // 页面初始化时加载好友列表（用于浏览伙伴页判断好友状态）
  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType === 'expert') {
        params.set('types', 'expert,coach');
      } else if (filterType) {
        params.set('type', filterType);
      }
      if (user?.id) params.set('excludeId', user.id);
      const response = await fetch(`/api/people/cards?${params}`);
      const data = await response.json();
      if (data.success) {
        setCards(data.cards || []);
      }
    } catch (error) {
      console.error('获取名片列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType, user?.id]);

  const fetchFriendRequests = useCallback(async () => {
    if (!user?.id) return;
    setRequestsLoading(true);
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch(`/api/friends?userId=${user.id}&type=received`),
        fetch(`/api/friends?userId=${user.id}&type=sent`)
      ]);
      const receivedData = await receivedRes.json();
      const sentData = await sentRes.json();
      if (receivedData.success) setFriendRequests(receivedData.requests || []);
      if (sentData.success) setSentRequests(sentData.requests || []);
    } catch (error) {
      console.error('获取好友申请失败:', error);
    } finally {
      setRequestsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (pageTab === 'requests') {
      fetchFriendRequests();
    }
  }, [pageTab, fetchFriendRequests]);

  // 前端搜索过滤 + 排除已好友
  const filteredCards = cards.filter(c => {
    // 已是好友的不显示在浏览清单
    if (friends.some(f => f.user_id === c.id || f.friend_id === c.id)) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.display_name?.toLowerCase().includes(term) ||
      c.real_name?.toLowerCase().includes(term) ||
      c.company_name?.toLowerCase().includes(term) ||
      c.expertise?.toLowerCase().includes(term) ||
      c.bio?.toLowerCase().includes(term) ||
      c.title?.toLowerCase().includes(term) ||
      c.cooperation?.toLowerCase().includes(term) ||
      c.industry?.toLowerCase().includes(term)
    );
  });

  const getDisplayName = (c: UserCard | FriendRequest) => {
    return c.display_name || c.real_name || c.company_name || '未命名用户';
  };

  const getFriendDisplayName = (req: FriendRequest) => {
    return req.display_name || req.real_name || req.company_name || '未命名用户';
  };

  const getFriendUserType = (req: FriendRequest): string => {
    if (req.user_type === 'enterprise') return 'enterprise';
    if (req.user_type === 'expert') return 'expert';
    if (req.identity_verified === 1) return 'partner';
    return 'personal';
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!user?.id) return;
    setSendingFriend(friendId);
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          friendId,
          message: friendMessage || null
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setFriendMessage('');
      } else {
        alert(data.error || '发送失败');
      }
    } catch (error) {
      console.error('发送好友申请失败:', error);
      alert('发送失败，请重试');
    } finally {
      setSendingFriend(null);
    }
  };

  const handleFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    if (!user?.id) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`/api/friends/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        fetchFriendRequests();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('处理好友申请失败:', error);
      alert('操作失败，请重试');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = friendRequests.length;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-2">发现伙伴</h1>
            <p className="text-white/80">欢迎伙伴们来广场露个脸！</p>
          </div>
        </div>

        {/* 顶层标签页：浏览伙伴 / 加为好友 */}
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setPageTab('browse')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                pageTab === 'browse'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Users className="w-4 h-4" />
              浏览伙伴
            </button>
            <button
              onClick={() => setPageTab('requests')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                pageTab === 'requests'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              加为好友
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setPageTab('friends')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                pageTab === 'friends'
                  ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              好友清单
              {friends.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                  {friends.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 浏览伙伴 */}
        {pageTab === 'browse' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* 搜索栏 */}
            <div className="relative max-w-md mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索姓名、公司、领域、合作意向..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 标签栏 - 基于名片类型 */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { key: '', label: '全部' },
                { key: 'personal', label: '个人' },
                { key: 'expert', label: '专家' },
                { key: 'partner', label: '合伙人' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filterType === tab.key
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 浏览伙伴列表 - 基于名片 */}
        {pageTab === 'browse' && (
          <div className="max-w-7xl mx-auto px-4 pb-12">
            {/* AI 推荐区域 */}
            {pageTab === 'browse' && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-500" />AI 推荐
                    </h3>
                    <button onClick={async () => {
                      setAiLoading(true);
                      try {
                        const profiles = cards.map(u => ({ name: u.display_name || u.real_name, industry: u.industry, bio: u.bio })).slice(0, 20);
                        const res = await fetch('/api/ai', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'match',
                            prompt: '根据我的信息，从以下候选人中推荐最值得认识合作的3-5位，按匹配度排序。返回格式：每行"人选 | 匹配度% | 推荐理由"',
                            context: `候选名单：${JSON.stringify(profiles)}`,
                            content: '请推荐最匹配的合作人选。',
                          }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          const lines = data.result.split('\n').filter(Boolean);
                          setAiRecommendations(lines);
                        }
                      } catch {} finally { setAiLoading(false); }
                    }} disabled={aiLoading}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {aiLoading ? '分析中' : '刷新'}
                    </button>
                    <button onClick={async () => {
                      setGraphLoading(true);
                      setGraphResult('');
                      try {
                        const names = cards.map(u => u.display_name || u.real_name || '未知').filter(Boolean).slice(0, 30);
                        const res = await fetch('/api/ai', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'analyze',
                            content: `用户列表：${names.join('、')}`,
                            prompt: '请分析以上用户之间的关系网络，找出关键连接人、潜在合作圈子和关系链建议。返回格式：\n1）关键连接人：xxx（理由）\n2）潜在圈子：xxx圈子（成员）\n3）关系链建议：xxx',
                            context: '这是一个商业信任平台的用户关系分析',
                          }),
                        });
                        const data = await res.json();
                        if (data.success) setGraphResult(data.result);
                      } catch {} finally { setGraphLoading(false); }
                    }} disabled={graphLoading}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      {graphLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      AI 关系图
                    </button>
                  </div>
                </div>
                {aiRecommendations.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                    {aiRecommendations.map((line, i) => {
                      const parts = line.split('|').map(s => s.trim());
                      return (
                        <div key={i} className="flex items-center gap-3 py-2 border-b border-purple-100 dark:border-purple-800 last:border-0">
                          <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 text-xs font-medium flex items-center justify-center">{i + 1}</span>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{parts[0] || line}</span>
                            {parts[1] && <span className="ml-2 text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">{parts[1]}</span>}
                            {parts[2] && <p className="text-xs text-slate-500 mt-0.5">{parts[2]}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {graphResult && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700">
                    <h4 className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">AI 关系图谱分析</h4>
                    <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{graphResult}</div>
                  </div>
                )}
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <Globe className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>暂无匹配的名片</p>
                <p className="text-sm mt-2 text-slate-400">创建名片后才会在此展示</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCards.map((c, index) => {
                  return (
                    <motion.div
                      key={c.cardId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => {
                        setSelectedCard(c);
                        setShowDetail(true);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${typeColors[c.cardType]}`}>
                            {c.avatar_url ? (
                              <img src={c.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                            ) : (
                              typeIcons[c.cardType]
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {getDisplayName(c)}
                              </h3>
                              {c.identity_verified === 1 && (
                                <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            {c.title && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{c.title}</p>
                            )}
                            <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${typeColors[c.cardType]}`}>
                              {typeIcons[c.cardType]}
                              {typeLabels[c.cardType]}名片
                            </p>
                          </div>
                        </div>
                        {(() => {
                          const isFriend = friends.some(f => f.user_id === c.id || f.friend_id === c.id);
                          if (isFriend) {
                            return (
                              <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-center gap-1">
                                <CheckCircle className="w-4 h-4" />
                                已是好友
                              </span>
                            );
                          }
                          return (
                            <button
                              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1"
                              onClick={e => {
                                e.stopPropagation();
                                sendFriendRequest(c.id);
                              }}
                              disabled={sendingFriend === c.id}
                            >
                              {sendingFriend === c.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserPlus className="w-4 h-4" />
                              )}
                              加好友
                            </button>
                          );
                        })()}
                      </div>

                      {c.bio && (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {c.bio}
                        </p>
                      )}

                      {c.cooperation && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-cyan-600 dark:text-cyan-400 line-clamp-1">{c.cooperation}</p>
                        </div>
                      )}

                      {c.expertise && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {c.expertise.split(',').slice(0, 3).map((exp, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                              {exp.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        {c.location && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="w-3 h-3" />
                            {c.location}
                          </span>
                        )}
                        {c.industry && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Briefcase className="w-3 h-3" />
                            {c.industry}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 加为好友标签页 */}
        {pageTab === 'requests' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* 子标签：收到申请 / 发出申请 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setRequestTab('received')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  requestTab === 'received'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                收到的申请
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingCount}</span>
                )}
              </button>
              <button
                onClick={() => setRequestTab('sent')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  requestTab === 'sent'
                    ? 'bg-cyan-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                }`}
              >
                <Send className="w-4 h-4" />
                发出的申请
              </button>
            </div>

            {requestsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : requestTab === 'received' ? (
              /* 收到的申请 */
              friendRequests.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <UserPlus className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>暂无待处理的好友申请</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {friendRequests.map((req, index) => {
                    const userType = getFriendUserType(req);
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${typeColors[userType]}`}>
                              {req.avatar_url ? (
                                <img src={req.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                              ) : (
                                typeIcons[userType]
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {getFriendDisplayName(req)}
                                </h3>
                                {req.identity_verified === 1 && (
                                  <Shield className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-1 ${typeColors[userType]}`}>
                                {typeIcons[userType]}
                                {typeLabels[userType]}名片
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleFriendRequest(req.id, 'accept')}
                              disabled={processingId === req.id}
                              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {processingId === req.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              同意
                            </button>
                            <button
                              onClick={() => handleFriendRequest(req.id, 'reject')}
                              disabled={processingId === req.id}
                              className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg transition-colors flex items-center gap-1.5 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              拒绝
                            </button>
                          </div>
                        </div>

                        {req.message && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">{req.message}</p>
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>申请时间：{new Date(req.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            ) : (
              /* 发出的申请 */
              sentRequests.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Send className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>暂无发出的好友申请</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map((req, index) => {
                    const userType = getFriendUserType(req);
                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${typeColors[userType]}`}>
                              {req.avatar_url ? (
                                <img src={req.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                              ) : (
                                typeIcons[userType]
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {getFriendDisplayName(req)}
                                </h3>
                                {req.identity_verified === 1 && (
                                  <Shield className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                              <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-1 ${typeColors[userType]}`}>
                                {typeIcons[userType]}
                                {typeLabels[userType]}名片
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                            req.status === 'pending'
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                              : req.status === 'accepted'
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                                : 'bg-red-50 dark:bg-red-900/20 text-red-600'
                          }`}>
                            {req.status === 'pending' ? '等待回复' : req.status === 'accepted' ? '已同意' : '已拒绝'}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                          <span>申请时间：{new Date(req.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}

        {/* 好友清单 */}
        {pageTab === 'friends' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {friendsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无所获好友</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map(item => (
                  <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {(item.display_name || item.real_name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.display_name || item.real_name || '未知用户'}</p>
                        {item.real_name && item.real_name !== item.display_name && (
                          <p className="text-xs text-slate-500">姓名：{item.real_name}</p>
                        )}
                        {item.phone && (
                          <p className="text-xs text-slate-500">手机：{item.phone}</p>
                        )}
                        <p className="text-xs text-slate-400">{item.user_type === 'enterprise' ? '企业' : item.user_type === 'expert' ? '专家' : '个人'}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 名片详情弹窗 */}
        {showDetail && selectedCard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">名片详情</h3>
                <button onClick={() => setShowDetail(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${typeColors[selectedCard.cardType]}`}>
                    {selectedCard.avatar_url ? (
                      <img src={selectedCard.avatar_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      typeIcons[selectedCard.cardType]
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                        {getDisplayName(selectedCard)}
                      </h4>
                      {selectedCard.identity_verified === 1 && (
                        <Shield className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {selectedCard.title && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCard.title}</p>
                    )}
                    <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${typeColors[selectedCard.cardType]}`}>
                      {typeIcons[selectedCard.cardType]}
                      {typeLabels[selectedCard.cardType]}名片
                    </p>
                  </div>
                </div>
                {(() => {
                  const isFriend = friends.some(f => (f.user_id === selectedCard.id || f.friend_id === selectedCard.id));
                  if (isFriend) {
                    return (
                      <span className="px-5 py-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        已是好友
                      </span>
                    );
                  }
                  return (
                    <button
                      className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors flex items-center gap-1.5"
                      onClick={() => {
                        sendFriendRequest(selectedCard.id);
                        setShowDetail(false);
                  }}
                      disabled={sendingFriend === selectedCard.id}
                    >
                      {sendingFriend === selectedCard.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      加好友
                    </button>
                  );
                })()}
              </div>

              <div className="space-y-3">
                {selectedCard.company_name && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <Building className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedCard.company_name}</span>
                  </div>
                )}
                {selectedCard.location && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedCard.location}</span>
                  </div>
                )}
                {selectedCard.industry && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedCard.industry}</span>
                  </div>
                )}
                {selectedCard.experience && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <GraduationCap className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedCard.experience}</span>
                  </div>
                )}
                {selectedCard.email && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedCard.email}</span>
                  </div>
                )}
                {selectedCard.bio && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">简介</p>
                    <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{selectedCard.bio}</div>
                  </div>
                )}
                {selectedCard.expertise && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">专业领域</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.expertise.split(',').map((exp, i) => (
                        <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300">
                          {exp.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedCard.cooperation && (
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
                    <p className="text-sm text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" />
                      合作意向
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">{selectedCard.cooperation}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}
