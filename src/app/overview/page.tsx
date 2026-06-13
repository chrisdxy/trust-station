"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import SiteGuide from '@/components/SiteGuide';
import {
  Shield, Globe, Heart, MessageCircle, Brain, Fingerprint, Users, Database, Sparkles
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { consensusItems } from '@/data/consensus';
import AISummary from '@/components/AISummary';

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>}>
      <OverviewContent />
    </Suspense>
  );
}

function OverviewContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'consensus' ? 'consensus' : 'navigation';
  const [activeTab, setActiveTab] = useState<'consensus' | 'navigation'>(initialTab);
  const [siteNavigation, setSiteNavigation] = useState<string>('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  // 加载设置中的使用指引内容
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* 标签切换 */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
          {([
            { id: 'navigation', label: '使用指引', icon: Globe },
            { id: 'consensus', label: '六项共识', icon: Shield }
          ] as { id: 'consensus' | 'navigation'; label: string; icon: any }[]).map(tab => {
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

        {/* 六项共识 */}
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
                  Database
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

        {/* 使用指引 - 交互式导览 */}
        {activeTab === 'navigation' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <SiteGuide />
          </motion.div>
        )}

      </div>
    </Layout>
  );
}
