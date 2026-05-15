"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, User, Building, Award, Search, X, MapPin, Mail, Phone, Star, Shield, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

type CardType = 'personal' | 'enterprise' | 'expert' | 'partner';

interface UserProfile {
  id: string;
  display_name?: string;
  real_name?: string;
  user_type?: string;
  company_name?: string;
  avatar_url?: string;
  location?: string;
  bio?: string;
  expertise?: string;
  identity_verified?: number;
  created_at?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  personal: <User className="w-5 h-5" />,
  enterprise: <Building className="w-5 h-5" />,
  expert: <Award className="w-5 h-5" />,
  partner: <Globe className="w-5 h-5" />,
};

const typeColors: Record<string, string> = {
  personal: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
  enterprise: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
  expert: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
  partner: 'bg-green-50 dark:bg-green-900/20 text-green-600',
};

const typeLabels: Record<string, string> = {
  personal: '个人',
  enterprise: '企业',
  expert: '专家',
  partner: '合伙人',
};

export default function PeoplePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filterType]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (user?.id) params.set('excludeId', user.id);
      
      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('获取用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.display_name?.toLowerCase().includes(term) ||
      u.real_name?.toLowerCase().includes(term) ||
      u.company_name?.toLowerCase().includes(term) ||
      u.expertise?.toLowerCase().includes(term) ||
      u.bio?.toLowerCase().includes(term)
    );
  });

  const getDisplayName = (u: UserProfile) => {
    return u.display_name || u.real_name || u.company_name || '未命名用户';
  };

  const getUserType = (u: UserProfile) => {
    if (u.user_type === 'enterprise') return 'enterprise';
    if (u.user_type === 'expert') return 'expert';
    if (u.identity_verified === 1) return 'partner';
    return 'personal';
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-2">发现伙伴</h1>
            <p className="text-white/80">拓展人脉，发现合作机会</p>
          </div>
        </div>

        {/* 名片分类标签 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">名片分类</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => setFilterType('personal')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filterType === 'personal'
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-cyan-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${typeColors.personal}`}>
                <User className="w-6 h-6" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white text-center">个人名片</p>
              <p className="text-xs text-slate-500 text-center mt-1">Individual</p>
            </button>
            <button
              onClick={() => setFilterType('enterprise')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filterType === 'enterprise'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${typeColors.enterprise}`}>
                <Building className="w-6 h-6" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white text-center">企业名片</p>
              <p className="text-xs text-slate-500 text-center mt-1">Enterprise</p>
            </button>
            <button
              onClick={() => setFilterType('expert')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filterType === 'expert'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-amber-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${typeColors.expert}`}>
                <Award className="w-6 h-6" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white text-center">专家名片</p>
              <p className="text-xs text-slate-500 text-center mt-1">Expert</p>
            </button>
            <button
              onClick={() => setFilterType('partner')}
              className={`p-4 rounded-xl border-2 transition-all ${
                filterType === 'partner'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${typeColors.partner}`}>
                <Globe className="w-6 h-6" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white text-center">合伙人名片</p>
              <p className="text-xs text-slate-500 text-center mt-1">Partner</p>
            </button>
          </div>

          {/* 搜索栏 */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setFilterType('')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterType === ''
                  ? 'bg-cyan-500 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              全部用户
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索用户姓名、公司、领域..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        {/* 列表 */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Globe className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无匹配的用户</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u, index) => {
                const userType = getUserType(u);
                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedUser(u);
                      setShowDetail(true);
                    }}
                  >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${typeColors[userType]}`}>
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                            ) : (
                              typeIcons[userType]
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white">
                                {getDisplayName(u)}
                              </h3>
                              {u.identity_verified === 1 && (
                                <Shield className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${typeColors[userType]}`}>
                              {typeIcons[userType]}
                              {typeLabels[userType]}名片
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors">
                          加好友
                        </button>
                      </div>

                    {u.bio && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {u.bio}
                      </p>
                    )}

                    {u.expertise && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {u.expertise.split(',').slice(0, 3).map((exp, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                            {exp.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      {u.location && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3" />
                          {u.location}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* 详情弹窗 */}
        {showDetail && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">名片详情</h3>
                <button onClick={() => setShowDetail(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${typeColors[getUserType(selectedUser)]}`}>
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <span className="text-2xl">{typeIcons[getUserType(selectedUser)]}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                        {getDisplayName(selectedUser)}
                      </h4>
                      {selectedUser.identity_verified === 1 && (
                        <Shield className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                    <p className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mt-2 ${typeColors[getUserType(selectedUser)]}`}>
                      {typeIcons[getUserType(selectedUser)]}
                      {typeLabels[getUserType(selectedUser)]}名片
                    </p>
                  </div>
                </div>
                <button className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
                  加好友
                </button>
              </div>

              <div className="space-y-3">
                {selectedUser.company_name && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <Building className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedUser.company_name}</span>
                  </div>
                )}
                {selectedUser.location && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedUser.location}</span>
                  </div>
                )}
                {selectedUser.bio && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">个人简介</p>
                    <p className="text-slate-700 dark:text-slate-300">{selectedUser.bio}</p>
                  </div>
                )}
                {selectedUser.expertise && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">专业领域</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.expertise.split(',').map((exp, i) => (
                        <span key={i} className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-sm text-slate-700 dark:text-slate-300">
                          {exp.trim()}
                        </span>
                      ))}
                    </div>
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
