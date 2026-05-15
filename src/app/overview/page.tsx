"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, FileText, Shield, Eye, Briefcase, Calendar,
  MessageSquare, MessageCircle, TrendingUp, Globe, Heart, Brain, Fingerprint, Database, Key
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { consensusItems } from '@/data/consensus';

export default function OverviewPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'consensus' | 'navigation' | 'data'>('consensus');
  const [onlineUsers] = useState(347);
  const [siteNavigation, setSiteNavigation] = useState<string>('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // 加载设置中的本站导航内容
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.general?.siteNavigation) {
            setSiteNavigation(data.general.siteNavigation);
          }
        }
      } catch (e) {
        console.error('加载设置失败', e);
      } finally {
        setLoadingSettings(false);
      }
    };
    if (activeTab === 'navigation') {
      fetchSettings();
    } else {
      setLoadingSettings(false);
    }
  }, [activeTab]);

  // 模拟平台数据
  const stats = {
    totalUsers: 12847,
    totalRelationships: 3856,
    totalRecords: 12893,
    totalAuthorizations: 4521,
    activeUsers: 2341,
    newUsersToday: 23,
    newRelationshipsToday: 8,
    newRecordsToday: 15,
    totalProjects: 892,
    totalActivities: 456,
    newProjectsToday: 5,
    newActivitiesToday: 3,
    todayVisits: 6832,
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    trend,
    color,
    delay = 0
  }: {
    icon: any;
    label: string;
    value: number | string;
    trend?: string;
    color: string;
    delay?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend && (
          <span className="text-xs text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          {([
            { id: 'consensus', label: '六条共识', icon: Shield },
            { id: 'navigation', label: '本站导航', icon: Globe },
            { id: 'data', label: '本站数据', icon: TrendingUp },
          ] as { id: 'consensus' | 'navigation' | 'data'; label: string; icon: any }[]).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 六条共识 */}
        {activeTab === 'consensus' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {consensusItems.map((item, idx) => {
                const iconMap: Record<string, any> = {
                  Heart,
                  MessageCircle,
                  Brain,
                  Fingerprint,
                  Users,
                  Database,
                };
                const Icon = iconMap[item.icon] || Shield;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700"
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                      {Icon && <Icon className="w-6 h-6 text-white" />}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">{item.subtitle}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* 本站导航 */}
        {activeTab === 'navigation' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-500" />
              本站导航
            </h2>
            {loadingSettings ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : siteNavigation ? (
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: siteNavigation }}
              />
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>暂无导航内容，请管理员在后台设置中配置。</p>
              </div>
            )}
          </motion.div>
        )}

        {/* 本站数据（原社区概览内容） */}
        {activeTab === 'data' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* 当前在线人数 + 今日访问 */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 mb-6 text-white">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm mb-1">当前在线人数</p>
                    <p className="text-3xl font-bold">{onlineUsers} 人</p>
                  </div>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <Eye className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm mb-1">今日访问次数</p>
                    <p className="text-3xl font-bold">{stats.todayVisits.toLocaleString()} 次</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 总览数据 */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                总览
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={Users} label="注册用户" value={stats.totalUsers} trend="+2.5%" color="text-blue-500" delay={0.1} />
                <StatCard icon={MessageSquare} label="合作关系" value={stats.totalRelationships} trend="+1.8%" color="text-green-500" delay={0.15} />
                <StatCard icon={FileText} label="认知留痕" value={stats.totalRecords} trend="+3.2%" color="text-purple-500" delay={0.2} />
                <StatCard icon={Key} label="授权查询" value={stats.totalAuthorizations} trend="+1.5%" color="text-amber-500" delay={0.25} />
                <StatCard icon={Briefcase} label="项目数量" value={stats.totalProjects} trend="+2.1%" color="text-teal-500" delay={0.3} />
                <StatCard icon={Calendar} label="活动数量" value={stats.totalActivities} trend="+1.3%" color="text-rose-500" delay={0.35} />
              </div>
            </div>

            {/* 今日统计 */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                今日统计
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { icon: Users, label: '新增用户', value: stats.newUsersToday, color: 'text-blue-500' },
                    { icon: MessageSquare, label: '新增关系', value: stats.newRelationshipsToday, color: 'text-green-500' },
                    { icon: FileText, label: '新增留痕', value: stats.newRecordsToday, color: 'text-purple-500' },
                    { icon: Briefcase, label: '新增项目', value: stats.newProjectsToday, color: 'text-teal-500' },
                    { icon: Calendar, label: '新增活动', value: stats.newActivitiesToday, color: 'text-rose-500' },
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="text-center">
                        <div className={`w-12 h-12 bg-${item.color.split('-')[1]}-100 dark:bg-${item.color.split('-')[1]}-900/30 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                          <Icon className={`w-6 h-6 ${item.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
