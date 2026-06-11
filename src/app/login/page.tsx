"use client";
import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Smartphone, MessageCircle, MessageSquare, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const LOGO_URL = "/uploads/logo.jpg";

const WECHAT_APPID = process.env.NEXT_PUBLIC_WECHAT_APPID || 'wx132561151d9c6e02';

// 检测是否在微信环境中
const isWeChatBrowser = () => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('micromessenger');
};

// 微信OAuth授权地址
const getWeChatAuthUrl = (redirectUri: string) => {
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_userinfo&state=wechat_login#wechat_redirect`;
};

// 加载状态组件
function LoginPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-white">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        <p className="mt-4">加载中...</p>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { revalidateSession } = useAuth();
  
  // 检测微信环境
  const [isWeChat, setIsWeChat] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [wechatError, setWechatError] = useState('');
  
  // 登录方式：password=密码登录, sms=短信验证码登录
  const [loginMethod, setLoginMethod] = useState<'password' | 'sms'>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const hasHandledCallback = useRef(false); // 防止重复处理微信回调
  const [autoRedirecting, setAutoRedirecting] = useState(false);

  // 检测微信环境并在微信浏览器中自动触发授权
  useEffect(() => {
    const inWeChat = isWeChatBrowser();
    setIsWeChat(inWeChat);
    
    // 检查是否有微信授权回调的code
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code && state === 'wechat_login') {
      // 防止重复处理微信回调
      if (hasHandledCallback.current) return;
      hasHandledCallback.current = true;
      // 处理微信授权回调
      handleWeChatCallback(code);
    } else if (inWeChat) {
      // 在微信环境中，自动触发授权
      triggerWeChatLogin();
    }
  }, [searchParams]);

  // 触发微信授权登录
  const triggerWeChatLogin = () => {
    setAutoRedirecting(true);
    const currentUrl = window.location.href.split('?')[0];
    const authUrl = getWeChatAuthUrl(currentUrl);
    window.location.href = authUrl;
  };

  // 处理微信授权回调
  const handleWeChatCallback = async (code: string) => {
    setWechatLoading(true);
    setWechatError('');
    
    try {
      // 调用后端接口换取用户信息
      const response = await fetch('/api/auth/wechat-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 存储微信用户信息
        localStorage.setItem('wechat_user', JSON.stringify(data.wechatUser));
        // 微信登录默认记住我，延长会话至7天
        localStorage.setItem('login_session_time', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
        localStorage.setItem('remember_me', 'true');
        
        // 创建用户数据
        const userData = {
          id: data.existingUserId || data.wechatUser.openid,
          phone: '',
          display_name: data.wechatUser.nickname || '微信用户',
          real_name: data.wechatUser.real_name || '',
          avatar_url: data.wechatUser.headimgurl || '',
          isWechatUser: true
        };
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('profile', JSON.stringify(userData));
        
        // 更新 AuthContext 状态
        revalidateSession();
        
        // 微信登录：老用户直接进入功能中心，新用户引导完善资料
        if (data.needsProfile) {
          router.push(`/complete-profile?source=wechat&openid=${encodeURIComponent(data.wechatUser.openid)}`);
        } else {
          router.push('/dashboard');
        }
      } else {
        setWechatError(data.error || '微信授权失败');
      }
    } catch (err) {
      setWechatError('微信登录失败，请重试');
    } finally {
      setWechatLoading(false);
    }
  };

  // 发送验证码
  const sendVerifyCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    
    setSendingCode(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'login' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCountdown(60);
        alert('验证码已发送');
      } else {
        setError(data.error || '发送失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setSendingCode(false);
    }
  };

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 微信一键登录（非微信环境下手动点击）
  const handleWeChatLogin = () => {
    if (isWeChatBrowser()) {
      triggerWeChatLogin();
    } else {
      // 非微信环境，提示使用微信扫码
      alert('请在微信中打开此页面使用微信登录');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }

    if (loginMethod === 'password' && !password) {
      setError('请输入密码');
      return;
    }

    if (loginMethod === 'sms' && (!verifyCode || verifyCode.length !== 6)) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password: loginMethod === 'password' ? password : undefined,
          verifyCode: loginMethod === 'sms' ? verifyCode : undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        // 合并登录返回的用户数据与本地存储的已有数据
        const localUserData = localStorage.getItem('user');
        const existingUser = localUserData ? JSON.parse(localUserData) : {};
        const mergedUser = {
          ...existingUser,
          ...data.user
        };
        
        // 从API获取完整用户档案
        let userProfile = {
          id: mergedUser.id,
          user_type: 'individual' as const,
          display_name: mergedUser.nickname || mergedUser.realName || '用户' + phone.slice(-4),
          real_name: mergedUser.realName || null,
          company_name: null,
          legal_rep_name: null,
          auth_rep_name: null,
          identity_verified: false,
          wallet_address: null,
          avatar_url: null,
          phone: phone
        };
        
        // 尝试从API获取完整资料
        try {
          const profileRes = await fetch(`/api/profile?userId=${mergedUser.id}`);
          const profileData = await profileRes.json();
          if (profileData.success && profileData.profile) {
            userProfile = {
              id: profileData.profile.id,
              user_type: profileData.profile.user_type || 'individual',
              display_name: profileData.profile.display_name || userProfile.display_name,
              real_name: profileData.profile.real_name || null,
              company_name: profileData.profile.company_name || null,
              legal_rep_name: null,
              auth_rep_name: null,
              identity_verified: profileData.profile.identity_verified || false,
              wallet_address: null,
              avatar_url: profileData.profile.avatar_url || null,
              phone: profileData.profile.phone || phone
            };
          }
        } catch (e) {
          console.log('获取资料失败，使用默认资料');
        }
        
        // 登录成功后清除之前的管理员状态
        if (typeof window !== 'undefined') {
          localStorage.removeItem('is_admin');
          localStorage.removeItem('admin_role');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        localStorage.setItem('user_data', JSON.stringify(mergedUser));
        localStorage.setItem('profile', JSON.stringify(userProfile));
        
        // 设置会话起始时间（isSessionValid() 根据 remember_me 标志计算有效期）
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('remember_me');
        }
        // 无论是否记住我，都存起始时间，isSessionValid() 会自动计算正确有效期
        localStorage.setItem('login_session_time', Date.now().toString());

        // 更新 AuthContext 状态（此时 login_session_time 已设置，revalidateSession 能正确读取）
        revalidateSession();

        // 检查是否需要完善资料（未填真实姓名/未勾选隐私协议/未勾选六项共识）
        if (data.needsCompletion) {
          router.push(`/complete-profile?source=login&token=${data.token}`);
          return;
        }

        // 登录成功后跳转：直接发现伙伴（待处理的好友请求）
        router.push('/dashboard');
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
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                登录
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                {t('app.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* 微信环境：仅显示微信登录相关 UI */}
            {isWeChat ? (
              <div className="space-y-4">
                {wechatError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center"
                  >
                    <p className="text-red-600 dark:text-red-400 text-sm mb-2">{wechatError}</p>
                    <button
                      onClick={() => { setWechatError(''); triggerWeChatLogin(); }}
                      className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                    >
                      重新授权
                    </button>
                  </motion.div>
                )}
                {(autoRedirecting || wechatLoading) && !wechatError && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 mx-auto text-amber-500 animate-spin mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      {autoRedirecting ? '正在跳转微信授权...' : '正在获取您的信息...'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 手机号 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    手机号
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      placeholder="请输入11位手机号"
                      required
                    />
                  </div>
                </div>

                {/* 登录方式切换 */}
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('password')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      loginMethod === 'password'
                        ? 'bg-white dark:bg-slate-600 text-amber-600 shadow'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    密码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('sms')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      loginMethod === 'sms'
                        ? 'bg-white dark:bg-slate-600 text-amber-600 shadow'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    验证码登录
                  </button>
                </div>

                {/* 密码登录表单 */}
                {loginMethod === 'password' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        placeholder="请输入密码"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* 验证码登录表单 */}
                {loginMethod === 'sms' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      短信验证码
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={verifyCode}
                          onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          placeholder="6位验证码"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={sendVerifyCode}
                        disabled={sendingCode || countdown > 0}
                        className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                      >
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 记住我 & 忘记密码 */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300" 
                    />
                    记住我
                  </label>
                  {loginMethod === 'password' && (
                    <Link href="/forgot-password" className="text-amber-600 hover:text-amber-700">
                      忘记密码？
                    </Link>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-spin">⟳</span>
                  ) : (
                    <>
                      登录
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </>
            )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                还没有账号？{' '}
                <Link href="/register" className="text-amber-600 hover:text-amber-700 font-medium">
                  立即注册
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// 包装组件，用 Suspense 包裹
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
