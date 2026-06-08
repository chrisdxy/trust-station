"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Layout from '@/components/Layout';

export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 排除登录页
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/register';

  useEffect(() => {
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    // 安全超时：5秒后强制结束加载状态，防止卡死
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setIsAuthorized(false);
    }, 5000);

    // 服务器端验证管理员权限
    const verifyAdmin = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const adminUser = localStorage.getItem('admin_user');
        
        if (!token || !adminUser) {
          router.push('/admin/login');
          return;
        }

        const admin = JSON.parse(adminUser);
        if (admin && admin.id) {
          setIsAuthorized(true);
        } else {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('验证失败:', error);
        router.push('/admin/login');
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    verifyAdmin().catch(() => {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setIsAuthorized(false);
    });

    return () => clearTimeout(timeoutId);
  }, [router, isLoginPage]);

  // 登录页直接显示，不包裹 Layout
  if (isLoginPage) {
    return children;
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 mb-4">验证中...</p>
          <button
            onClick={() => router.push('/')}
            className="text-amber-600 hover:text-amber-700 text-sm underline"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // 未授权
  if (!isAuthorized) {
    return null;
  }

  return <Layout>{children}</Layout>;
}
