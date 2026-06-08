"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, User, ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { updateProfile, revalidateSession } = useAuth();
  const token = searchParams.get('token');
  const source = searchParams.get('source'); // 'wechat' | 'login' | null
  const openidFromUrl = searchParams.get('openid'); // 从 URL 获取 openid
  
  // 检测是否来自微信登录
  const isFromWeChat = source === 'wechat' && !!openidFromUrl;
  // 检测来源 - 微信登录 / SMS登录 / SMS注册 都必须完善资料
  const isRequired = isFromWeChat || source === 'wechat' || source === 'login' || source === 'register';
  
  const [formData, setFormData] = useState({
    nickname: '',
    realName: '',
    phone: '',
    avatar_url: '',
    privacyAgreed: false,
    consensusAgreed: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileAlreadyComplete, setProfileAlreadyComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // 如果没有token且不是微信登录，跳转回注册页
  useEffect(() => {
    if (!token && !isFromWeChat) {
      router.push('/register');
    }
  }, [token, isFromWeChat, router]);

  // 如果是微信登录，预填微信用户信息
  useEffect(() => {
    if (isFromWeChat) {
      const wechatUser = localStorage.getItem("wechat_user");
      if (wechatUser) {
        try {
          const user = JSON.parse(wechatUser);
          setFormData(prev => ({
            ...prev,
            nickname: user.nickname || "",
            realName: user.real_name || "",
            avatar_url: user.headimgurl || "",
          }));
        } catch (e) {
          console.error('Failed to parse wechat user:', e);
        }
      }
    }
  }, [isFromWeChat]);

  // 检查微信老用户是否已完善资料 - 静默登录
  useEffect(() => {
    if (!isFromWeChat || !openidFromUrl) return;

    const checkExistingUser = async () => {
      setCheckingProfile(true);
      try {
        // 先静默登录，检查是否已完善资料
        const loginResponse = await fetch('/api/auth/wechat-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openid: openidFromUrl,
            nickname: '',
            realName: '',
            phone: undefined,
          }),
        });

        const loginData = await loginResponse.json();

        if (loginData.success && loginData.user?.profileComplete) {
          // 资料已完善，直接登录并跳转
          setProfileAlreadyComplete(true);

          // 保存用户信息
          const wechatUser = localStorage.getItem("wechat_user");
          const wxUser = wechatUser ? JSON.parse(wechatUser) : {};

          const formattedUser = {
            id: loginData.user.id,
            phone: loginData.user.phone || '',
            user_type: 'individual',
            display_name: loginData.user.display_name || wxUser.nickname || '微信用户',
            real_name: loginData.user.realName || wxUser.real_name || '',
            avatar_url: wxUser.headimgurl || '',
            isWechatUser: true,
          };

          localStorage.setItem('auth_token', loginData.token);
          localStorage.setItem('user', JSON.stringify(formattedUser));
          localStorage.setItem('user_data', JSON.stringify(formattedUser));
          localStorage.setItem('profile', JSON.stringify(formattedUser));
          localStorage.setItem('login_session_time', Date.now().toString());
          localStorage.removeItem('wechat_user');

          // 刷新 AuthContext 状态
          revalidateSession();

          // 延迟跳转，让用户看到提示
          setTimeout(() => {
            router.push('/people');
          }, 1500);
        }
      } catch (err) {
        console.error('静默登录检查失败:', err);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkExistingUser();
  }, [isFromWeChat, openidFromUrl, router, revalidateSession]);

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
setFormData(prev => ({ ...prev, avatar_url: base64 }));
        setUploadingAvatar(false);
};
      reader.onerror = () => {
        setError('图片读取失败');
        setUploadingAvatar(false);
};
      reader.readAsDataURL(file);
    } catch (err) {
      setError('头像上传失败');
      setUploadingAvatar(false);
    }

    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!formData.realName.trim()) {
      setError('请输入真实姓名');
      return;
    }
    if (!formData.privacyAgreed) {
      setError('请先勾选同意《隐私协议》');
      return;
    }
    if (!formData.consensusAgreed) {
      setError('请先勾选同意平台六项共识');
      return;
    }
    // 微信登录时手机号必填
    if (isFromWeChat && !formData.phone.trim()) {
      setError('请输入手机号');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
}

      // 如果是微信登录，先创建用户
      if (isFromWeChat) {
        // 优先从 URL 获取 openid，备选从 localStorage
        let openid = openidFromUrl;
        if (!openid) {
          const wechatUser = localStorage.getItem('wechat_user');
          const userData = wechatUser ? JSON.parse(wechatUser) : {};
          openid = userData.openid;
        }
        
        // 检查 openid 是否存在
        if (!openid) {
          setError('微信授权信息已过期，请重新登录');
          setLoading(false);
          return;
        }
        
        const loginResponse = await fetch('/api/auth/wechat-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            openid: openid,
            nickname: formData.nickname,
            realName: formData.realName,
            phone: formData.phone || undefined,
            avatarUrl: formData.avatar_url || undefined,
            privacyAgreed: formData.privacyAgreed,
            consensusAgreed: formData.consensusAgreed,
          }),
        });
        
        const loginData = await loginResponse.json();
        
        if (loginData.success) {
          // 格式化用户数据，确保包含所有必要字段
          const formattedUser = {
            id: loginData.user.id,
            phone: loginData.user.phone || formData.phone || '',
            user_type: 'individual',
            display_name: formData.nickname,
            real_name: formData.realName,
            avatar_url: formData.avatar_url,
            isWechatUser: true,
          };
          
          localStorage.setItem('auth_token', loginData.token);
          localStorage.setItem('user', JSON.stringify(formattedUser));
          localStorage.setItem('user_data', JSON.stringify(formattedUser));
          localStorage.setItem('profile', JSON.stringify(formattedUser));
          localStorage.setItem('login_session_time', Date.now().toString());
          localStorage.removeItem('wechat_user');
          
          // 刷新 AuthContext 状态（关键！）
          revalidateSession();
          
          setIsCompleted(true);
          setTimeout(() => {
            router.push('/people');
          }, 3000);
        } else {
          setError(loginData.error || '登录失败');
        }
} else {
        // 普通注册后完善资料 - 从URL获取手机号
        const phoneFromUrl = searchParams.get('phone');
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
        const userData = savedUser ? JSON.parse(savedUser) : null;
        const phone = phoneFromUrl || userData?.phone;
        
        const response = await fetch('/api/auth/complete-profile', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: phone,
            display_name: formData.nickname,
            real_name: formData.realName,
            user_type: 'individual',
            company_name: null,
            privacy_agreed: formData.privacyAgreed ? 1 : 0,
            consensus_agreed: formData.consensusAgreed ? 1 : 0,
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 更新本地 profile
          await updateProfile({
            display_name: formData.nickname,
            real_name: formData.realName,
          });
          setIsCompleted(true);
          // 3秒后跳转到发现页面
          setTimeout(() => {
            router.push('/people');
          }, 3000);
        } else {
          setError(data.error || '保存失败');
        }
}
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // 微信登录必须完善资料，不允许跳过
    if (isRequired) {
      setError('请先完善您的资料');
      return;
    }
    router.push('/people');
  };

  if (!token && !isFromWeChat) {
    return null;
  }

  // 正在检查微信老用户资料状态
  if (checkingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center max-w-md"
        >
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            正在登录...
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            请稍候
          </p>
        </motion.div>
      </div>
    );
  }

  // 微信老用户资料已完善，直接登录成功
  if (profileAlreadyComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            登录成功
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            欢迎回来，正在跳转...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center max-w-md"
        >
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            资料完善成功
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            欢迎加入正道驿站，正在跳转...
          </p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-amber-400" />
          <span className="text-white font-bold text-xl">{t('app.name')}</span>
        </Link>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                完善资料
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                {isFromWeChat ? '首次登录，请完善您的基本信息' : '让合作伙伴更好地认识您'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* 头像上传 */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-amber-400 rounded-full flex items-center justify-center overflow-hidden">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-[#1e3a5f]" />
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors cursor-pointer">
                    {uploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">点击上传头像</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  手机号 {isFromWeChat ? <span className="text-red-500">*</span> : <span className="text-slate-400 text-xs">（选填，绑定后可用手机号登录）</span>}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder={isFromWeChat ? "请输入手机号（必填）" : "请输入手机号（选填）"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  昵称 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="您希望被如何称呼"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  真实姓名 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.realName}
                    onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="请输入您的真实姓名"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">真实姓名将显示在您的用户资料中</p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  您可以在用户资料页继续完善头像、简介等信息。
                </p>
              </div>

              {/* 隐私协议勾选 */}
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <input
                  type="checkbox"
                  checked={formData.privacyAgreed}
                  onChange={(e) => setFormData({ ...formData, privacyAgreed: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  我已阅读并同意《<a href="/privacy" target="_blank" className="text-amber-600 underline">隐私协议</a>》
                </span>
              </label>

              {/* 六项共识勾选 */}
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <input
                  type="checkbox"
                  checked={formData.consensusAgreed}
                  onChange={(e) => setFormData({ ...formData, consensusAgreed: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  我同意平台六个卡片公布的<strong>根本共识、沟通共识、心性成长、行为留痕、伙伴优选、平台存档</strong>六条规则
                </span>
              </label>

              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <>
                    {isFromWeChat ? '完成登录' : '完成注册'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              {!isRequired && (
                <button
                  onClick={handleSkip}
                  className="w-full py-2 text-slate-500 dark:text-slate-400 text-sm"
                >
                  稍后完善 →
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse">加载中...</div></div>}>
      <CompleteProfileContent />
    </Suspense>
  );
}
