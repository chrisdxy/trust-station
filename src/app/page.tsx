"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users, Lock, Scale, Database, Brain, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { WeChatShareSetup } from '@/components/WeChatShareSetup';

const LOGO_URL = "/uploads/logo.jpg";

export default function HomePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [isWeChat, setIsWeChat] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    const inWeChat = ua.includes('micromessenger');
    setIsWeChat(inWeChat);
  }, []);

  // 定义功能卡片配对
  const featureGroups = [
    [
      { icon: Shield, titleKey: 'home.feature.consensus', descKey: 'home.feature.consensus.desc' },
      { icon: Users, titleKey: 'home.feature.communication', descKey: 'home.feature.communication.desc' }
    ],
    [
      { icon: Brain, titleKey: 'home.feature.mindset', descKey: 'home.feature.mindset.desc' },
      { icon: Database, titleKey: 'home.highlight.blockchain', descKey: 'home.highlight.blockchain.desc' }
    ],
    [
      { icon: Lock, titleKey: 'home.highlight.privacy', descKey: 'home.highlight.privacy.desc' },
      { icon: Scale, titleKey: 'home.highlight.neutral', descKey: 'home.highlight.neutral.desc' }
    ]
  ];

  return (
    <>
      <WeChatShareSetup title="正道驿站 | Trust Station" description="全球商业信任共建社区 — 让合作有迹可循，让成长和信任在真实交往中沉淀" imageUrl="/uploads/logo.jpg" />
      <div className="min-h-screen bg-white dark:bg-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-transparent">
              <Image 
                src={LOGO_URL} 
                alt="Logo" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
            <span className="text-white font-bold text-lg sm:text-xl">{t('app.name')}</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900" />
        {/* 背景装饰光晕 */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-5 w-60 h-60 bg-amber-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-5 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        </div>

        {/* 内容区域 - 居中显示 */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          {/* 副标题标签 */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 border border-white/10">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t('app.subtitle')}
            </span>
          </div>

          {/* 主标题 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {t('home.hero.title')}
            <span className="block text-lg sm:text-xl md:text-2xl font-normal text-amber-400 mt-3">
              {t('home.hero.subtitle')}
            </span>
          </h1>

          {/* 立即登录按钮 */}
          <div className="mt-8">
            <button
              onClick={() => {
                if (isAuthenticated) {
                  // 已登录：进入功能中心
                  router.push('/dashboard');
                } else {
                  // 未登录：走正常登录流程
                  if (isWeChat) {
                    const WECHAT_APPID = process.env.NEXT_PUBLIC_WECHAT_APPID || 'wx132561151d9c6e02';
                    const redirectUri = window.location.origin + '/login';
                    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_userinfo&state=wechat_login#wechat_redirect`;
                    window.location.href = authUrl;
                  } else {
                    router.push('/login');
                  }
                }
              }}
              className="px-10 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              立即登录
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-3xl mx-auto space-y-4">
          {/* 每组两个卡片并排 */}
          {featureGroups.map((group, groupIdx) => (
            <div 
              key={groupIdx} 
              className="grid grid-cols-2 gap-4"
            >
              {group.map((item, _itemIdx) => (
                <div
                  key={item.titleKey}
                  className="text-center p-5 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-all border border-slate-100 dark:border-slate-700"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-900 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <item.icon className="text-amber-400" size={22} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                    {t(item.titleKey)}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">{t(item.descKey)}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/50">
        <div className="w-full max-w-2xl mx-auto text-center">
          <div
          >
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {t('home.cta.title')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm px-4">
              {t('home.cta.description')}
            </p>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  router.push('/dashboard');
                } else {
                  if (isWeChat) {
                    const WECHAT_APPID = process.env.NEXT_PUBLIC_WECHAT_APPID || 'wx132561151d9c6e02';
                    const redirectUri = window.location.origin + '/login';
                    const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APPID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_userinfo&state=wechat_login#wechat_redirect`;
                    window.location.href = authUrl;
                  } else {
                    router.push('/login');
                  }
                }
              }}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm"
            >
              立即登录
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 三列链接 - 同一行 */}
          <div className="flex justify-center gap-8 mb-4 text-sm">
            <Link href="/about" className="hover:text-amber-400 transition-colors">
              关于我们
            </Link>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">
              隐私政策
            </Link>
          </div>
          {/* 版权信息 */}
          <p className="text-center text-slate-400 text-xs">
            上海如是我闻企业管理顾问有限公司
          </p>
          <p className="text-center text-slate-400 text-xs">
            © 2026 正道驿站 All Rights Reserved.
          </p>
          <p className="text-center text-slate-400 text-xs mt-1">
            <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
              沪ICP备2023009236号-1
            </a>
          </p>
        </div>
      </footer>
      </div>
    </>
  );
}
