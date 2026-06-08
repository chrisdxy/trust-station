"use client";
import React from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {/* 返回首页链接 */}
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm">
            <Home size={16} />
            <span>返回首页</span>
          </Link>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            用户隐私政策
          </h1>
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                前言
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                正道驿站（以下简称"我们"）非常重视用户的个人信息和隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息，以及您享有的相关权利。请您在使用我们的服务前，仔细阅读并了解本隐私政策。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                一、信息收集
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                我们可能会收集以下类型的信息：
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                <li><strong>注册信息：</strong>包括用户名、手机号码、电子邮件地址等</li>
                <li><strong>身份信息：</strong>包括真实姓名、身份证号码（仅在实名认证时）</li>
                <li><strong>企业信息：</strong>如您注册为企业用户，我们可能收集公司名称、营业执照等</li>
                <li><strong>操作信息：</strong>包括您在我们平台上的操作记录、合作关系、认知留痕等</li>
                <li><strong>设备信息：</strong>包括设备型号、操作系统、IP地址等</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                二、信息使用
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                我们收集您的信息主要用于以下目的：
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                <li>提供、维护和改进我们的服务</li>
                <li>处理您的注册请求和身份认证</li>
                <li>管理您的合作关系和记录</li>
                <li>向您发送服务通知和更新</li>
                <li>响应您的咨询和反馈</li>
                <li>保护我们的合法权益和用户安全</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                三、信息共享
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                除以下情况外，我们不会与第三方共享您的个人信息：
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                <li>获得您的明确同意</li>
                <li>根据法律法规要求或政府主管部门的要求</li>
                <li>为保护我们的合法权益而必须披露</li>
                <li>您与我们的合作伙伴共同完成某项服务时（仅限必要信息）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                四、信息存储
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                我们会采取合理的安全措施保护您的个人信息，包括数据加密、访问控制、安全审计等。我们会将您的个人信息存储在安全的服务器上，并根据相关法律法规的要求保留一定期限。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                五、您的权利
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                您对您的个人信息享有以下权利：
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                <li>访问您的个人信息</li>
                <li>更正不准确的个人信息</li>
                <li>删除您的个人信息</li>
                <li>撤回您的同意授权</li>
                <li>注销您的账户</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                六、Cookie政策
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                我们使用Cookie和类似技术来改善您的用户体验。Cookie是存储在您设备上的小型文本文件，用于识别您的浏览器并记住您的偏好设置。您可以通过浏览器设置禁用Cookie，但这可能会影响部分服务功能。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                七、未成年人保护
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                我们非常重视对未成年人个人信息的保护。如果您是未满18周岁的未成年人，请在监护人的陪同下阅读本政策，并在取得监护人的同意后使用我们的服务。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                八、政策更新
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                我们可能会不时更新本隐私政策。更新后的政策将在平台上公布，并自公布之日起生效。我们鼓励您定期查阅本政策以了解最新变化。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                九、联系我们
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                如您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：<br />
                邮箱：admin@globaltrustleders.com<br />
                我们将在合理期限内予以回复。
              </p>
            </section>

            <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 text-center">
                更新日期：2024年1月1日<br />
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
