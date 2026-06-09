"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Shield, LayoutDashboard, Users, FileText, Scale, BarChart3,
  Settings, LogOut, Menu, X, ChevronDown, Bell, Search, TrendingUp, Home, Sparkles, FolderTree, Eye, ListOrdered, MessageSquare
} from 'lucide-react';

const LOGO_URL = "/uploads/logo.jpg";

interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: 'super_admin' | 'admin';
}

// 超级管理员菜单
const superAdminNavItems = [
  { path: '/admin', label: '控制台', icon: LayoutDashboard },
  { path: '/admin/users', label: '用户管理', icon: Users },
  { path: '/admin/categories', label: '分类设置', icon: FolderTree },
  { path: '/admin/sort', label: '发布管理', icon: ListOrdered },
  { path: '/admin/public-records', label: '公开记录', icon: Eye },
  { path: '/admin/mediation', label: '协调管理', icon: Scale },
  { path: '/admin/feedbacks', label: '投诉与建议', icon: MessageSquare },
  { path: '/admin/ai-tools', label: 'AI工具管理', icon: Sparkles },
  { path: '/admin/stats', label: '数据统计', icon: BarChart3 },
  { path: '/admin/settings', label: '系统设置', icon: Settings }
];

// 管理员菜单
const adminNavItems = [
  { path: '/admin', label: '控制台', icon: LayoutDashboard },
  { path: '/admin/users', label: '用户管理', icon: Users },
  { path: '/admin/categories', label: '分类设置', icon: FolderTree },
  { path: '/admin/sort', label: '发布管理', icon: ListOrdered },
  { path: '/admin/public-records', label: '公开记录', icon: Eye },
  { path: '/admin/mediation', label: '协调管理', icon: Scale },
  { path: '/admin/feedbacks', label: '投诉与建议', icon: MessageSquare },
  { path: '/admin/ai-tools', label: 'AI工具管理', icon: Sparkles },
  { path: '/admin/stats', label: '数据统计', icon: BarChart3 },
  { path: '/admin/settings', label: '系统设置', icon: Settings }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [feedbackUnread, setFeedbackUnread] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');
    
    if (!token || !userStr) {
      router.push('/admin/login');
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      setAdmin(user);
    } catch {
      router.push('/admin/login');
    }
  }, [router]);

  // 定时获取投诉建议未读数
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/feedbacks?status=pending&limit=1');
        const data = await res.json();
        if (data.success) {
          const uc = data.unreadCounts || {};
          setFeedbackUnread((uc.complaint || 0) + (uc.suggestion || 0));
        }
      } catch {}
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 30000); // 每30秒刷新
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    router.push('/admin/login');
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 根据角色显示不同菜单
  const currentNavItems = admin.role === 'super_admin' ? superAdminNavItems : adminNavItems;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-slate-800 to-slate-900 z-50 flex items-center justify-between px-4 shadow-lg border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all lg:hidden"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image src={LOGO_URL} alt="Logo" width={32} height={32} className="w-full h-full object-cover" unoptimized />
              </div>
            <span className="text-white font-bold text-lg hidden sm:block">管理后台</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{admin.name[0]}</span>
              </div>
              <span className="text-white text-sm hidden md:block">{admin.name}</span>
              <ChevronDown size={16} />
            </button>
            
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-2 border border-slate-200 dark:border-slate-700"
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                  <p className="font-medium text-slate-900 dark:text-white">{admin.name}</p>
                  <p className="text-xs text-slate-500">{admin.phone}</p>
                </div>
                <Link
                  href="/"
                  className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  返回首页
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 h-full overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索菜单..."
                className="w-full pl-9 pr-4 py-2 bg-white/10 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          
          <nav className="space-y-1">
            {/* 回首页 */}
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-slate-300 hover:bg-white/5 hover:text-white border-b border-slate-700/50 pb-4 mb-2"
            >
              <Home size={20} />
              <span className="font-medium">回首页</span>
            </Link>
            
            {currentNavItems.map(item => {
              const Icon = item.icon;
              const isActive = typeof window !== 'undefined' && window.location.pathname === item.path;
              const showBadge = item.path === '/admin/feedbacks' && feedbackUnread > 0;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-400/20 to-transparent border-l-2 border-amber-400 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-amber-400' : ''} />
                  <span className="font-medium">{item.label}</span>
                  {showBadge && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {feedbackUnread > 99 ? '99+' : feedbackUnread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span>系统运行正常</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </div>
  );
}
