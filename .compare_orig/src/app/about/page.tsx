"use client";
import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            关于我们
          </h1>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                平台简介
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                正道驿站是一个全球商业信任共建社区，探索安全、可信的商业信任共建模式。当前，我们先从国内正心伙伴的正心规则开始，打磨、验证与推进。欢迎有兴趣者加入我们一起推进。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                使命
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                正道驿站促进道、富足与和平，让正心伙伴互相成就、走向卓越！
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                愿景
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                链接天下正心伙伴，构建最广泛的正心产业共同体，成为正心伙伴规则（新型商业信任规则/正心链）引领者！
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                口号
              </h2>
              <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>正道驿站，真诚相伴！</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>让正心伙伴凝成一股产业力量！</span>
                </li>
              </ul>
            </section>

            <section className="mb-6">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                <strong>备注：</strong>什么是正道？中华文化之道是正道，其核心貌似高深而又简单，落到实处又是很平常的。正心合道，就在当下。有道才能富足与无忧，内富才能更好地外富。内心的自大、贪婪和愤怒是暴力的根本来源。这不仅体现在各地热战冲突中，还会体现在企业领导力、家庭关系和人际交往中。非暴力沟通是一个需要正念训练才能实现的境界。正心正念才能合道、富足与和平，才有助于企业成功和家庭的和谐与幸福。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                联系我们
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                如有任何问题或建议，欢迎通过以下方式联系我们：<br />
                邮箱：admin@globaltrustleders.com
              </p>
            </section>

            <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 text-center">
                沪ICP备2023009236号-1
              </p>
            </section>
          </div>

          {/* 返回首页按钮 */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
