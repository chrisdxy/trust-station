"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, Shield, FileText, Users2, Scale, Briefcase, Calendar, 
  Globe, Handshake, Sparkles, ChevronRight, BarChart3, Clock,
  TrendingUp, CheckCircle, AlertCircle, Bell, Settings, LogOut,
  Award, Building, Target, MessageSquare, Brain
} from 'lucide-react';
import Layout from '@/components/Layout';

interface UserStats {
  totalProfiles: number;
  publicProfiles: number;
  connections: number;
  mediationCases: number;
  partnerDownline: number;
}

interface RecentActivity {
  id: string;
  type: 'profile' | 'mediation' | 'partner' | 'system';
  title: string;
  time: string;
  status?: 'success' | 'pending' | 'info';
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<{ name: string; nickname?: string; display_name?: string; phone?: string } | null>(null);
  const [stats, setStats] = useState<UserStats>({
    totalProfiles: 0,
    publicProfiles: 0,
    connections: 0,
    mediationCases: 0,
    partnerDownline: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [partnerStatus, setPartnerStatus] = useState<{ status: string; level?: string } | null>(null);
  const [mediatorStatus, setMediatorStatus] = useState<{ status: string } | null>(null);

  useEffect(() => {
    // 检查是否已登录，未登录跳转到登录页
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      const sessionTime = localStorage.getItem('login_session_time');
      
      if (!userData || !sessionTime) {
        // 未登录，跳转到登录页
        window.location.href = '/login';
        return;
      }
      
      // 检查会话是否过期
      const isRemember = localStorage.getItem('remember_me') === 'true';
      const duration = isRemember ? 7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      const elapsed = Date.now() - parseInt(sessionTime, 10);
      if (elapsed >= duration) {
        // 会话过期，跳转到登录页
        window.location.href = '/login';
        return;
      }
    }

    // 加载用户数据
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // 加载名片统计
    const profiles = JSON.parse(localStorage.getItem('public_profiles') || '[]');
    const publicCount = profiles.filter((p: { isPublic: boolean }) => p.isPublic).length;
    setStats(prev => ({
      ...prev,
      totalProfiles: profiles.length,
      publicProfiles: publicCount
    }));

    // 加载合伙人状态
    const partnerData = localStorage.getItem('user_partner_profile');
    if (partnerData) {
      const partner = JSON.parse(partnerData);
      setPartnerStatus(partner);
      if (partner.status === 'approved') {
        const downline = JSON.parse(localStorage.getItem('user_partner_downline') || '{"totalCount":0}');
        setStats(prev => ({
          ...prev,
          partnerDownline: downline.totalCount
        }));
      }
    }

    // 加载协调专家状态
    const mediatorData = localStorage.getItem('user_mediator_profile');
    if (mediatorData) {
      const mediator = JSON.parse(mediatorData);
      setMediatorStatus(mediator);
      if (mediator.status === 'approved') {
        // 模拟案件数
        setStats(prev => ({
          ...prev,
          mediationCases: 3
        }));
      }
    }

    // 模拟最近活动
    setRecentActivities([
      { id: '1', type: 'profile', title: '更新了个人名片信息', time: '2小时前', status: 'success' },
      { id: '2', type: 'partner', title: '提交了事业合伙人申请', time: '1天前', status: 'pending' },
      { id: '3', type: 'system', title: '完成了身份认证', time: '3天前', status: 'success' },
      { id: '4', type: 'mediation', title: '协调案件已归档', time: '1周前', status: 'info' }
    ]);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '凌晨好';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜里好';
  };

  const menuItems = [
    { href: '/profile', icon: User, label: '个人中心', color: 'from-green-400 to-green-500', desc: '管理个人信息' },
    { href: '/people', icon: Globe, label: '发现广场', color: 'from-blue-400 to-blue-500', desc: '寻找合作伙伴' },
    { href: '/projects', icon: Briefcase, label: '项目中心', color: 'from-indigo-400 to-indigo-500', desc: '发现优质项目' },
    { href: '/activities', icon: Calendar, label: '活动中心', color: 'from-pink-400 to-pink-500', desc: '参与精彩活动' },
    { href: '/communities', icon: Users2, label: '成长共同体', color: 'from-cyan-400 to-cyan-500', desc: '加入成长社群' },
    { href: '/cooperation', icon: Handshake, label: '合作中心', color: 'from-amber-400 to-amber-500', desc: '管理合作关系' },
    { href: '/archives', icon: FileText, label: '记录中心', color: 'from-teal-400 to-teal-500', desc: '记录认知历程' },
    { href: '/mediation', icon: Scale, label: '协调中心', color: 'from-orange-400 to-orange-500', desc: '纠纷协调服务' },
    { href: '/ai', icon: Sparkles, label: 'AI工具', color: 'from-indigo-400 to-purple-500', desc: '发现智能工具' }
  ];

  const quickActions = [
    { icon: User, label: '创建名片', href: '/profile?action=create', color: 'bg-green-500' },
    { icon: Calendar, label: '发起活动', href: '/activities?action=create', color: 'bg-pink-500' },
    { icon: Briefcase, label: '发布项目', href: '/projects?action=create', color: 'bg-indigo-500' },
    { icon: Users2, label: '创建共同体', href: '/communities?action=create', color: 'bg-cyan-500' }
  ];

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* 顶部欢迎区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-6 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                {getGreeting()}，{authUser?.display_name || authUser?.real_name || authUser?.nickname || user?.display_name || user?.name || user?.phone?.replace('UID','').slice(-4) || '用户'}
              </h1>
              <p className="text-amber-100">欢迎回来，开启心性成长与可信合作之旅！</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <Link href="/profile">
                <button className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>

          {/* 身份标签 */}
          <div className="flex items-center gap-2 mt-4">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">平台用户</span>
            {partnerStatus?.status === 'approved' && (
              <span className="px-3 py-1 bg-green-500 rounded-full text-sm flex items-center gap-1">
                <Handshake className="w-3 h-3" />
                {partnerStatus.level}
              </span>
            )}
            {partnerStatus?.status === 'pending' && (
              <span className="px-3 py-1 bg-amber-500 rounded-full text-sm">合伙人审核中</span>
            )}
            {mediatorStatus?.status === 'approved' && (
              <span className="px-3 py-1 bg-purple-500 rounded-full text-sm flex items-center gap-1">
                <Scale className="w-3 h-3" />
                协调专家
              </span>
            )}
            {mediatorStatus?.status === 'pending' && (
              <span className="px-3 py-1 bg-amber-500 rounded-full text-sm">协调专家审核中</span>
            )}
          </div>
        </motion.div>

        {/* 统计卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6"
        >
          {mediatorStatus?.status === 'approved' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Scale className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.mediationCases}</p>
                  <p className="text-xs text-slate-500">协调案件</p>
                </div>
              </div>
            </div>
          )}

        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 功能菜单 */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">功能中心</h2>
              <div className="grid grid-cols-3 gap-3">
                {menuItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + idx * 0.03 }}
                        className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-medium text-slate-900 dark:text-white text-sm mb-1">{item.label}</h3>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* 快捷操作 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mt-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">快捷操作</h2>
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.label} href={action.href}>
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.05 }}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all"
                      >
                        <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300">{action.label}</span>
                      </motion.button>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 最近活动 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">最近活动</h2>
              <div className="space-y-4">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.status === 'success' ? 'bg-green-100 text-green-600' :
                      activity.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {activity.status === 'success' && <CheckCircle className="w-4 h-4" />}
                      {activity.status === 'pending' && <Clock className="w-4 h-4" />}
                      {activity.status === 'info' && <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{activity.title}</p>
                      <p className="text-xs text-slate-400">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 申请通道入口 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-6 text-white"
            >
              <h2 className="text-lg font-semibold mb-3">成为专家与合伙人</h2>
              <p className="text-sm text-purple-100 mb-4">申请成为协调专家或事业合伙人，开启更多权益</p>
              <Link href="/profile">
                <button className="w-full py-2.5 bg-white text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors">
                  前往申请
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
