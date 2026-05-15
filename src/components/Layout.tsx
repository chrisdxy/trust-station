"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Home, Users, FileText, Search, Scale, Briefcase,
  Calendar, Globe, Users2, Menu, X, LogOut, ChevronLeft, User, Key, Layout as LayoutIcon, Sparkles, BarChart3
} from 'lucide-react';
import Footer from './Footer';

const navItems = [
  { path: '/', labelKey: 'nav.home', icon: Home },
  { path: '/overview', labelKey: 'nav.community', icon: BarChart3 },
  { path: '/profile', labelKey: 'nav.profile', icon: User },
  { path: '/people', labelKey: 'nav.people', icon: Globe },
  { path: '/communities', labelKey: 'nav.communities', icon: Users2 },
  { path: '/activities', labelKey: 'nav.activities', icon: Calendar },
  { path: '/projects', labelKey: 'nav.projects', icon: Briefcase },
  { path: '/cooperation', labelKey: 'nav.cooperation', icon: Users },
  { path: '/archives', labelKey: 'nav.archives', icon: FileText },
  { path: '/mediation', labelKey: 'nav.mediation', icon: Scale },
];

// 管理员侧边栏菜单
const adminNavItems = [
  { path: '/dashboard', labelKey: 'dashboard.title', icon: Home },
  { path: '/admin/users', labelKey: 'admin.users', icon: Users },
  { path: '/admin/categories', labelKey: 'admin.categories', icon: FileText },
  { path: '/admin/partners', labelKey: 'admin.partners', icon: Users2 },
  { path: '/admin/stats', labelKey: 'admin.stats', icon: BarChart3 },
  { path: '/admin/settings', labelKey: 'admin.settings', icon: Key },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();

  // 只使用 AuthContext 的数据，不再读取 localStorage
  const currentUser = user;
  const currentProfile = profile;

  // 判断是否为管理员或超级管理员
  const isAdmin = currentUser && (
    currentUser.user_type === 'admin' || 
    currentUser.user_type === 'super_admin'
  );

  // 判断是否为不需要侧边栏的页面（关于我们、隐私政策等公开页面）
  const isPublicPage = pathname === '/about' || pathname === '/privacy' || pathname === '/terms';
  
  // 未登录时隐藏侧边栏的页面
  const hideSidebarWithoutLogin = isPublicPage && !currentUser;

  // 根据用户类型选择菜单项
  const currentNavItems = isAdmin ? adminNavItems : navItems;

  // 检查当前路径是否激活
  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await signOut();
    // 清除管理员状态
    if (typeof window !== 'undefined') {
      localStorage.removeItem('is_admin');
      localStorage.removeItem('admin_role');
      localStorage.removeItem('user');
      localStorage.removeItem('user_data');
      localStorage.removeItem('profile');
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] z-50 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          {!hideSidebarWithoutLogin && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          )}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-transparent">
              <Image 
                src="/logo.jpg" 
                alt="Logo" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">{t('app.name')}</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 如果是管理员，显示返回首页按钮 */}
          {isAdmin && (
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg text-sm transition-all"
            >
              <Home size={16} />
              <span>返回首页</span>
            </Link>
          )}

          {/* AI工具 - 普通用户登录后显示（管理员不显示） */}
          {currentUser && !isAdmin && (
            <Link
              href="/ai"
              className="flex items-center gap-2 px-3 py-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-all"
            >
              <Sparkles size={16} />
              <span>AI工具</span>
            </Link>
          )}
          
          {loading ? (
            // 加载中：显示占位符，不显示登录/注册按钮
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse"></div>
            </div>
          ) : currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center overflow-hidden">
                  {currentProfile?.avatar_url ? (
                    <img src={currentProfile.avatar_url} alt="头像" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-[#1e3a5f]" />
                  )}
                </div>
                <span className="text-white/80 text-sm hidden md:block">
                  {currentProfile?.display_name || currentProfile?.real_name || currentUser.phone?.slice(-4) || '用户'}
                </span>
              </button>
              
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg py-2 border border-gray-100 dark:border-slate-700"
                  >
                    {isAdmin && (
                      <button
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            localStorage.removeItem('is_admin');
                            localStorage.removeItem('admin_role');
                            localStorage.removeItem('admin_token');
                          }
                          router.push('/admin/login');
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-amber-600 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                      >
                        <LayoutIcon size={16} />
                        退出管理
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      {t('nav.logout')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-white/80 hover:text-white text-sm"
              >
                {t('nav.login')}
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-amber-400 text-[#1e3a5f] rounded-lg font-medium text-sm hover:bg-amber-500 transition-colors"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar - 未登录的公开页面不显示 */}
      {!hideSidebarWithoutLogin && (
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-gradient-to-b from-slate-900 via-[#1e3a5f] to-slate-900 border-r border-slate-700/50 z-40 transform transition-transform duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 h-full overflow-y-auto">
          <nav className="space-y-1">
            {isAdmin && (
              <div className="mb-4 px-4 py-2 bg-amber-400/10 rounded-lg border border-amber-400/20">
                <p className="text-amber-400 text-sm font-medium">
                  {currentUser?.user_type === 'super_admin' ? '超级管理员' : '管理员'}
                </p>
                <p className="text-slate-400 text-xs mt-1">管理后台</p>
              </div>
            )}
            {currentNavItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              // 在协调中心后面添加分隔线
              if (item.path === '/mediation') {
                return (
                  <React.Fragment key="divider">
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                        active
                          ? 'bg-gradient-to-r from-amber-400/20 to-transparent border-l-2 border-amber-400 text-white'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={20} className={active ? 'text-amber-400' : ''} />
                      <span className="font-medium">{t(item.labelKey)}</span>
                    </Link>
                    <div className="my-3 border-t border-slate-700/50" />
                  </React.Fragment>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? 'bg-gradient-to-r from-amber-400/20 to-transparent border-l-2 border-amber-400 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-amber-400' : ''} />
                  <span className="font-medium">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

      </aside>
      )}

      {/* Main Content */}
      <main className={`pt-16 min-h-screen${hideSidebarWithoutLogin ? '' : ' lg:ml-64'}`}>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && !hideSidebarWithoutLogin && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}
    </div>
  );
}
