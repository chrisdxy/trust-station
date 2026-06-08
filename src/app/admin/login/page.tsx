"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Smartphone, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const LOGO_URL = "/logo.jpg";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 登录处理函数
  const performAdminLogin = (admin: any) => {
    localStorage.setItem('admin_token', 'admin-token-' + Date.now());
    localStorage.setItem('admin_user', JSON.stringify(admin));
    localStorage.setItem('is_admin', 'true');
    localStorage.setItem('admin_role', admin.role);
    // 管理员也需要设置 login_session_time，但不设置普通用户相关的数据
    localStorage.setItem('login_session_time', Date.now().toString());
    // 不再设置 user 和 profile，避免与普通用户状态混淆
    router.push('/admin');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password
        })
      });

      const data = await response.json();

      if (data.success) {
        performAdminLogin(data.admin);
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden">
                <Image src={LOGO_URL} alt="Logo" width={32} height={32} className="w-full h-full object-cover" unoptimized />
              </div>
          <span className="text-white font-bold text-xl">正道驿站</span>
        </Link>
        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
          管理员入口
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-4">
                <Image src={LOGO_URL} alt="Logo" width={64} height={64} className="w-full h-full object-cover" unoptimized />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                管理员登录
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                正道驿站管理后台
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* 手机号登录 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  管理员手机号
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    placeholder="请输入管理员手机号"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  登录密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    placeholder="请输入登录密码"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || !phone || !password}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium rounded-lg shadow-lg shadow-amber-500/30 disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    登录
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="text-amber-600 hover:text-amber-700 dark:text-amber-400">
                返回用户登录
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
