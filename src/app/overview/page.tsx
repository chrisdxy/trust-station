"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import SiteGuide from '@/components/SiteGuide';
import {
  Shield, Globe, Heart, MessageCircle, Brain, Fingerprint, Users, Database, Sparkles, BarChart3, Loader2
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
  const [trustScore, setTrustScore] = useState<string>('');
  const [scoreLoading, setScoreLoading] = useState(false);

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

        {/* AI 信任画像概览 */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 mb-6 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />信任画像概览
              </h2>
              <p className="text-xs text-indigo-500 mt-0.5">AI 综合分析你的活跃度、合作记录与社交关系</p>
            </div>
            <button onClick={async () => {
              setScoreLoading(true);
              try {
                const res = await fetch('/api/ai', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'analyze',
                    content: '请生成一份信任画像分析，基于以下维度评估：1）社区参与度 2）活动活跃度 3）合作诚信度 4）社交网络广度。给出一份综合信任评分和成长建议。',
                    prompt: '请以专业、鼓励的语气，为用户生成一份简洁的信任画像分析报告。包含综合评分（百分制）、各维度得分简述、以及2-3条可执行的提升建议。',
                    context: '这是一份社交信任平台的用户概览数据',
                  }),
                });
                const data = await res.json();
                if (data.success) setTrustScore(data.result);
              } catch {} finally { setScoreLoading(false); }
            }} disabled={scoreLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors">
              {scoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {scoreLoading ? '分析中...' : '刷新信任画像'}
            </button>
          </div>
          {trustScore && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{trustScore}</div>
            </div>
          )}
          {!trustScore && !scoreLoading && (
            <div className="text-center py-8 text-indigo-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">点击上方按钮，AI 将综合分析你的平台活跃度生成信任画像</p>
            </div>
          )}
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
