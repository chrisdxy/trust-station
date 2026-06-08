"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Shield, Users, MessageSquare, Brain, Database,
  Scale, ChevronRight, ChevronLeft, Home, Building2,
  FileText, Briefcase, Lock, Key, Eye, Calendar,
  Search, Copy, CheckCircle, Heart, AlertTriangle,
  Sparkles, ArrowRight, Star, Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Step = {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  color: string;
  content: {
    type: 'principle' | 'operation' | 'structure' | 'tips';
    items: { icon?: any; text: string; highlight?: string }[];
  };
};

const steps: Step[] = [
  {
    id: 'principles',
    icon: Shield,
    title: '六大核心共识',
    subtitle: '平台运作的基础理念',
    color: 'from-amber-500 to-orange-500',
    content: {
      type: 'principle',
      items: [
        { text: '正心正念，互相成就，共创共享', highlight: '根本共识' },
        { text: '非暴力沟通，真诚协作', highlight: '沟通共识' },
        { text: '正念训练，安住当下，尊道贵德', highlight: '心性成长' },
        { text: '坦荡者敢于留痕，可靠看得见', highlight: '行为留痕' },
        { text: '协作共识，择优合作', highlight: '伙伴优选' },
        { text: '数据安全，永久存档', highlight: '平台存档' }
      ]
    }
  },
  {
    id: 'sidebar',
    icon: Home,
    title: '左侧导航菜单',
    subtitle: '了解每个模块的作用',
    color: 'from-blue-500 to-cyan-500',
    content: {
      type: 'structure',
      items: [
        { icon: Home, text: '首页 — 概览与入口', highlight: '' },
        { icon: Globe, text: '本站导航 — 使用指引与六项共识', highlight: '' },
        { icon: Building2, text: '成长共同体 — 创建/加入学习型组织', highlight: '' },
        { icon: Briefcase, text: '项目中心 — 发布/跟进合作项目', highlight: '' },
        { icon: FileText, text: '记录中心 — 认知留痕与可看记录', highlight: '' },
        { icon: Calendar, text: '活动中心 — 发起/参与活动', highlight: '' },
        { icon: Shield, text: '协调中心 — 申请/处理协调', highlight: '' },
        { icon: Users, text: '个人中心 — 账户与档案管理', highlight: '' }
      ]
    }
  },
  {
    id: 'records',
    icon: FileText,
    title: '核心操作',
    subtitle: '记录中心是枢纽',
    color: 'from-purple-500 to-pink-500',
    content: {
      type: 'operation',
      items: [
        { text: '点击导航进入对应模块', highlight: '1' },
        { text: '点击右上角按钮创建新事项', highlight: '2' },
        { text: '每个事项都有唯一ID（如 CMTxxx, PRJ-xxx）', highlight: '3' },
        { text: '点击ID可复制，粘贴到记录中心搜索', highlight: '4' },
        { text: '记录中心「添加认知留痕」关联事项', highlight: '5' },
        { text: '他人可通过授权查看你的认知留痕', highlight: '6' }
      ]
    }
  },
  {
    id: 'id-system',
    icon: Key,
    title: 'ID 体系',
    subtitle: '全站统一的事项目录',
    color: 'from-green-500 to-emerald-500',
    content: {
      type: 'tips',
      items: [
        { text: '共同体ID=CMTxxxxxxxx → 记录中心查', highlight: '🏘️' },
        { text: '项目ID=PRJ-xxxxxxxx → 记录中心查', highlight: '📋' },
        { text: '活动ID=ACTxxxxxxxx → 记录中心查', highlight: '📅' },
        { text: '合作ID=RELxxxxxxxx → 记录中心查', highlight: '🤝' },
        { text: '记录ID=RCDxxxxxxxx → 记录中心查', highlight: '📝' },
        { text: '点击任意ID徽章自动复制，可粘贴搜索', highlight: '📋' }
      ]
    }
  },
  {
    id: 'flow',
    icon: ArrowRight,
    title: '典型工作流',
    subtitle: '从入门到协作',
    color: 'from-rose-500 to-red-500',
    content: {
      type: 'operation',
      items: [
        { text: '创建/加入共同体 → 找到志同道合的伙伴', highlight: '起点' },
        { text: '发布项目 → 在共同体或独立发起项目', highlight: '行动' },
        { text: '建立合作 → 正式合作或意向合作', highlight: '信任' },
        { text: '认知留痕 → 在记录中心记录心得', highlight: '沉淀' },
        { text: '授权可看 → 允许他人查看你的留痕', highlight: '透明' },
        { text: '协调申请 → 有分歧时申请协调', highlight: '化解' }
      ]
    }
  }
];

export default function SiteGuide() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];

  const handleOnboarded = () => {
    if (user?.id) {
      localStorage.setItem('has_onboarded_' + user.id, 'true');
    }
    router.push('/people?tab=requests');
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 bg-white rounded-full" />
          <div className="absolute bottom-4 left-8 w-20 h-20 bg-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-white rounded-full" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Globe className="w-8 h-8" />
            正道驿站 · 快速入门
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-xl">
            5 分钟了解平台核心概念与操作，按步骤浏览或直接跳转感兴趣的部分。
          </p>
        </div>
      </div>

      {/* 步骤指示器 */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 mb-6">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                i === currentStep
                  ? 'bg-gradient-to-r ' + s.color + ' text-white shadow-lg scale-105'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>

        {/* 步骤内容 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {/* 标题区 */}
            <div className={`bg-gradient-to-r ${step.color} rounded-xl p-5 mb-6 text-white`}>
              <div className="flex items-center gap-3 mb-1">
                <step.icon className="w-7 h-7" />
                <h2 className="text-xl font-bold">{step.title}</h2>
              </div>
              <p className="text-white/80 text-sm">{step.subtitle}</p>
            </div>

            {/* 内容区 */}
            {step.content.type === 'principle' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {step.content.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group bg-slate-50 dark:bg-slate-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl p-4 border border-slate-200 dark:border-slate-600 hover:border-amber-300 dark:hover:border-amber-600 transition-all cursor-default"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold shadow">
                        {i + 1}
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{item.highlight}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {step.content.type === 'structure' && (
              <div className="space-y-2">
                {step.content.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {item.icon && <item.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{item.text}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </motion.div>
                ))}
              </div>
            )}

            {step.content.type === 'operation' && (
              <div className="space-y-3">
                {step.content.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow flex-shrink-0 ${
                      item.highlight === '1' || item.highlight === '2' || item.highlight === '3' || item.highlight === '4' || item.highlight === '5' || item.highlight === '6'
                        ? 'bg-gradient-to-br from-purple-400 to-pink-500'
                        : 'bg-gradient-to-br from-rose-400 to-red-500'
                    }`}>
                      {item.highlight}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1.5">{item.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {step.content.type === 'tips' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {step.content.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group"
                    title="点击可复制ID到记录中心搜索"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform">{item.highlight}</span>
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{item.text}</p>
                    </div>
                    <Copy className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 ml-auto transition-colors" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 导航按钮 */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep ? 'bg-indigo-500 w-6' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow"
          >
            下一步
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 快速开始提示 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">上手只需要三步</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-slate-600 dark:text-slate-400">完善个人档案</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-slate-600 dark:text-slate-400">创建/加入成长共同体</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-slate-600 dark:text-slate-400">开始在记录中心认知留痕</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 确认已学习按钮 */}
      <div className="flex justify-center">
        <button
          onClick={handleOnboarded}
          className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-medium text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          我已了解，进入发现伙伴
        </button>
      </div>
    </div>
  );
}
