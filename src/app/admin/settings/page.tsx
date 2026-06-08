"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Key, Globe, Save, TestTube, Mail, CheckCircle, XCircle, Loader2, MessageSquare, MessageCircle } from 'lucide-react';
import AdminLayout from '../AdminLayout';

interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

const DEFAULT_SMTP: SmtpConfig = {
  host: 'smtp.example.com',
  port: '587',
  secure: false,
  user: '',
  pass: '',
  fromEmail: '',
  fromName: '正道驿站',
  enabled: false
};

interface GeneralConfig {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  icpNumber: string;
  siteNavigation?: string;
}

interface SecurityConfig {
  loginAttempts: number;
  sessionTimeout: number;
  requireVerify: boolean;
}

interface SmsConfig {
  enabled: boolean;
  simulate: boolean;
  provider: 'aliyun' | 'tencent' | 'submail';
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  templateCode: string;
  templateCodeLogin: string;
  appId?: string;
}

interface WechatConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  token: string;
  aesKey: string;
  qrcodeUrl: string;
}

interface ShumaiConfig {
  appId: string;
  appSecurity: string;
}

const DEFAULT_GENERAL: GeneralConfig = {
  siteName: '正道驿站',
  siteDescription: '全球商业信任共建社区',
  contactEmail: '',
  icpNumber: ''
};

const DEFAULT_SECURITY: SecurityConfig = {
  loginAttempts: 5,
  sessionTimeout: 30,
  requireVerify: true
};

const DEFAULT_SMS: SmsConfig = {
  enabled: false,
  simulate: false,
  provider: 'aliyun',
  accessKeyId: '',
  accessKeySecret: '',
  signName: '正道驿站',
  templateCode: '',
  templateCodeLogin: ''
};

const DEFAULT_WECHAT: WechatConfig = {
  enabled: false,
  appId: '',
  appSecret: '',
  token: '',
  aesKey: '',
  qrcodeUrl: ''
};

const DEFAULT_SHUMAI: ShumaiConfig = {
  appId: '',
  appSecurity: ''
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [generalConfig, setGeneralConfig] = useState<GeneralConfig>(DEFAULT_GENERAL);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(DEFAULT_SMTP);
  const [smsConfig, setSmsConfig] = useState<SmsConfig>(DEFAULT_SMS);
  const [wechatConfig, setWechatConfig] = useState<WechatConfig>(DEFAULT_WECHAT);
  const [shumaiConfig, setShumaiConfig] = useState<ShumaiConfig>(DEFAULT_SHUMAI);
  
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

  const [testPhone, setTestPhone] = useState('');
  const [testingSms, setTestingSms] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<{success: boolean; message: string} | null>(null);

  // 加载配置数据
  useEffect(() => {
    // 模拟加载数据
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        // 兼容 general / general_config 两种 key
        if (data.general || data.general_config) setGeneralConfig(data.general || data.general_config);
        if (data.security || data.security_config) setSecurityConfig(data.security || data.security_config);
        if (data.smtp_config) setSmtpConfig(data.smtp_config);
        if (data.sms_config) setSmsConfig(data.sms_config);
        if (data.wechat_config) setWechatConfig(data.wechat_config);
        if (data.shumai_config) setShumaiConfig(data.shumai_config);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const tabs = [
    { id: 'general', label: '基本设置', icon: Settings },
    { id: 'navigation', label: '使用指引', icon: Globe },
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'email', label: '邮件设置', icon: Mail },
    { id: 'sms', label: '短信设置', icon: MessageSquare },
    { id: 'wechat', label: '公众号配置', icon: Globe },
    { id: 'shumai', label: '数脉API', icon: Shield }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          general_config: generalConfig,
          security_config: securityConfig,
          smtp_config: smtpConfig,
          sms_config: smsConfig,
          wechat_config: wechatConfig,
          shumai_config: shumaiConfig
        })
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    
    setTestingEmail(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, config: smtpConfig })
      });
      
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message || data.error
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: '测试失败，请检查配置'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) return;
    
    setTestingSms(true);
    setSmsTestResult(null);
    
    try {
      const response = await fetch('/api/admin/settings/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, config: smsConfig })
      });
      
      const data = await response.json();
      setSmsTestResult({
        success: data.success,
        message: String(data.message || data.error || '未知错误')
      });
    } catch (error) {
      setSmsTestResult({
        success: false,
        message: '测试失败，请检查配置'
      });
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="max-w-6xl mx-auto">
          {/* 页面标题 */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">系统设置</h1>
            <p className="text-sm text-slate-500 mt-1">管理平台的基本配置和安全设置</p>
          </div>

          <div className="flex">
            {/* 侧边栏 */}
            <div className="w-64 border-r border-slate-200 dark:border-slate-700 p-4">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* 内容区 */}
            <div className="flex-1">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 m-6"
              >
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">基本设置</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          网站名称
                        </label>
                        <input
                          type="text"
                          value={generalConfig.siteName}
                          onChange={e => setGeneralConfig({ ...generalConfig, siteName: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          网站描述
                        </label>
                        <textarea
                          value={generalConfig.siteDescription}
                          onChange={e => setGeneralConfig({ ...generalConfig, siteDescription: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          联系邮箱
                        </label>
                        <input
                          type="email"
                          value={generalConfig.contactEmail}
                          onChange={e => setGeneralConfig({ ...generalConfig, contactEmail: e.target.value })}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          ICP备案号
                        </label>
                        <input
                          type="text"
                          value={generalConfig.icpNumber}
                          onChange={e => setGeneralConfig({ ...generalConfig, icpNumber: e.target.value })}
                          placeholder="如：沪ICP备XXXXXXXX号"
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 使用指引配置 */}
                {activeTab === 'navigation' && (
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">使用指引配置</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      支持 HTML 内容，可添加本站的主要栏目导航说明。保存后在社区概览的「使用指引」标签中展示。
                    </p>
                    <textarea
                      value={generalConfig.siteNavigation || ''}
                      onChange={e => setGeneralConfig({ ...generalConfig, siteNavigation: e.target.value })}
                      rows={18}
                      placeholder="可输入 HTML 内容，例如：&#10;<ul>&#10;  <li><a href='/overview'>社区概览</a></li>&#10;  <li><a href='/people'>发现广场</a></li>&#10;</ul>"
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                    <p className="text-xs text-slate-400 mt-2">直接输入 HTML，支持链接、列表等富文本内容。</p>
                  </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">安全设置</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          登录失败次数限制
                        </label>
                        <input
                          type="number"
                          value={securityConfig.loginAttempts}
                          onChange={e => setSecurityConfig({ ...securityConfig, loginAttempts: parseInt(e.target.value) })}
                          min={1}
                          max={10}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">连续登录失败超过此次数将锁定账号</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          会话超时时间（分钟）
                        </label>
                        <input
                          type="number"
                          value={securityConfig.sessionTimeout}
                          onChange={e => setSecurityConfig({ ...securityConfig, sessionTimeout: parseInt(e.target.value) })}
                          min={5}
                          max={120}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <input
                          type="checkbox"
                          id="requireVerify"
                          checked={securityConfig.requireVerify}
                          onChange={e => setSecurityConfig({ ...securityConfig, requireVerify: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-300 text-blue-500"
                        />
                        <label htmlFor="requireVerify" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          登录时需要验证码
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Settings */}
                {activeTab === 'email' && (
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">邮件设置</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">启用邮件服务</p>
                          <p className="text-sm text-slate-500">开启后将使用SMTP发送邮件</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={smtpConfig.enabled}
                            onChange={e => setSmtpConfig({ ...smtpConfig, enabled: e.target.checked })}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                        </label>
                      </div>

                      {smtpConfig.enabled && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                SMTP服务器
                              </label>
                              <input
                                type="text"
                                value={smtpConfig.host}
                                onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                placeholder="smtp.example.com"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                端口
                              </label>
                              <input
                                type="text"
                                value={smtpConfig.port}
                                onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                placeholder="587"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <input
                              type="checkbox"
                              id="secure"
                              checked={smtpConfig.secure}
                              onChange={e => setSmtpConfig({ ...smtpConfig, secure: e.target.checked })}
                              className="w-5 h-5 rounded border-slate-300 text-blue-500"
                            />
                            <label htmlFor="secure" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              使用SSL/TLS加密连接
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                用户名
                              </label>
                              <input
                                type="text"
                                value={smtpConfig.user}
                                onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                                placeholder="your@email.com"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                密码/授权码
                              </label>
                              <input
                                type="password"
                                value={smtpConfig.pass}
                                onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                发件人邮箱
                              </label>
                              <input
                                type="email"
                                value={smtpConfig.fromEmail}
                                onChange={e => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                                placeholder="noreply@example.com"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                发件人名称
                              </label>
                              <input
                                type="text"
                                value={smtpConfig.fromName}
                                onChange={e => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                                placeholder="正道驿站"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          {/* 测试邮件 */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <label className="block text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                              测试邮件
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={testEmail}
                                onChange={e => setTestEmail(e.target.value)}
                                placeholder="输入测试邮箱地址"
                                className="flex-1 px-4 py-2 border border-blue-200 dark:border-blue-800 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                              <button
                                onClick={handleTestEmail}
                                disabled={testingEmail || !testEmail}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                              >
                                {testingEmail ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <TestTube className="w-4 h-4" />
                                )}
                                发送测试
                              </button>
                            </div>
                            {testResult && (
                              <div className={`mt-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.success ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" /> {testResult.message}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <XCircle className="w-4 h-4" /> {testResult.message}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Help Text */}
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">配置说明</h4>
                            <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                              <li>• QQ邮箱：SMTP服务器 smtp.qq.com，端口 587，需要开启SMTP服务并获取授权码</li>
                              <li>• 163邮箱：SMTP服务器 smtp.163.com，端口 465</li>
                              <li>• 企业邮箱：请咨询您的邮件服务商获取正确的SMTP配置</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SMS Settings */}
                {activeTab === 'sms' && (
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">短信设置</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">启用短信服务</p>
                          <p className="text-sm text-slate-500">开启后将使用短信发送验证码</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!smsConfig.enabled ? (
                            <button
                              onClick={() => setSmsConfig({ ...smsConfig, enabled: true })}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              启动设置
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSmsConfig({ ...smsConfig, enabled: false }); alert('短信服务已停用'); }}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              停用
                            </button>
                          )}
                        </div>
                      </div>

                      {smsConfig.enabled && (
                        <div className="space-y-4">
                          {/* 模拟发送开关 */}
                          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                            <div>
                              <p className="font-medium text-amber-700 dark:text-amber-400">模拟发送模式</p>
                              <p className="text-sm text-amber-600 dark:text-amber-500">开启后不会真正发送短信，仅在控制台打印验证码</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={smsConfig.simulate}
                                onChange={e => setSmsConfig({ ...smsConfig, simulate: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-checked:bg-amber-500 rounded-full peer dark:bg-slate-700 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              短信服务商
                            </label>
                            <select
                              value={smsConfig.provider}
                              onChange={e => setSmsConfig({ ...smsConfig, provider: e.target.value as any })}
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                              <option value="aliyun">阿里云短信服务</option>
                              <option value="tencent">腾讯云短信服务</option>
                              <option value="submail">短信宝</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                AccessKey ID
                              </label>
                              <input
                                type="text"
                                value={smsConfig.accessKeyId}
                                onChange={e => setSmsConfig({ ...smsConfig, accessKeyId: e.target.value })}
                                placeholder="请输入AccessKey ID"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                AccessKey Secret
                              </label>
                              <input
                                type="password"
                                value={smsConfig.accessKeySecret}
                                onChange={e => setSmsConfig({ ...smsConfig, accessKeySecret: e.target.value })}
                                placeholder="请输入AccessKey Secret"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          {/* 腾讯云需要 SmsSdkAppId */}
                          {smsConfig.provider === 'tencent' && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                SmsSdkAppId（短信应用ID）
                              </label>
                              <input
                                type="text"
                                value={smsConfig.appId || ''}
                                onChange={e => setSmsConfig({ ...smsConfig, appId: e.target.value })}
                                placeholder="请输入短信应用SmsSdkAppId"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              短信签名
                            </label>
                            <input
                              type="text"
                              value={smsConfig.signName}
                              onChange={e => setSmsConfig({ ...smsConfig, signName: e.target.value })}
                              placeholder="请输入短信签名"
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                注册验证码模板ID
                              </label>
                              <input
                                type="text"
                                value={smsConfig.templateCode}
                                onChange={e => setSmsConfig({ ...smsConfig, templateCode: e.target.value })}
                                placeholder="SMS_XXXXXXX"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                登录验证码模板ID
                              </label>
                              <input
                                type="text"
                                value={smsConfig.templateCodeLogin}
                                onChange={e => setSmsConfig({ ...smsConfig, templateCodeLogin: e.target.value })}
                                placeholder="SMS_XXXXXXX"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">配置说明</h4>
                            <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
                              <li>• 请前往阿里云/腾讯云短信服务控制台申请开通短信服务</li>
                              <li>• 需要添加短信签名和验证码模板</li>
                              <li>• 模板需要审核通过后才能使用</li>
                            </ul>
                          </div>

                          {/* 测试短信 */}
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <label className="block text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                              测试短信
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="tel"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                placeholder="输入测试手机号"
                                className="flex-1 px-4 py-2 border border-green-200 dark:border-green-800 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                              <button
                                onClick={handleTestSms}
                                disabled={testingSms || !testPhone}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                              >
                                {testingSms ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MessageCircle className="w-4 h-4" />
                                )}
                                发送测试
                              </button>
                            </div>
                            {smsTestResult && (
                              <div className={`mt-2 text-sm ${smsTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {smsTestResult.success ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" /> {smsTestResult.message}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <XCircle className="w-4 h-4" /> {smsTestResult.message}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* WeChat Official Account Settings */}
                {activeTab === 'wechat' && (
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">公众号配置</h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">启用公众号登录</p>
                          <p className="text-sm text-slate-500">开启后微信用户可一键登录</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!wechatConfig.enabled ? (
                            <button
                              onClick={() => setWechatConfig({ ...wechatConfig, enabled: true })}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              启动设置
                            </button>
                          ) : (
                            <button
                              onClick={() => { setWechatConfig({ ...wechatConfig, enabled: false }); alert('公众号登录已停用'); }}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              停用
                            </button>
                          )}
                        </div>
                      </div>

                      {wechatConfig.enabled && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                微信公众号AppID
                              </label>
                              <input
                                type="text"
                                value={wechatConfig.appId}
                                onChange={e => setWechatConfig({ ...wechatConfig, appId: e.target.value })}
                                placeholder="wxXXXXXXXXXXXXXX"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                微信公众号AppSecret
                              </label>
                              <input
                                type="password"
                                value={wechatConfig.appSecret}
                                onChange={e => setWechatConfig({ ...wechatConfig, appSecret: e.target.value })}
                                placeholder="请输入AppSecret"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                服务器配置Token（非必填）
                              </label>
                              <input
                                type="text"
                                value={wechatConfig.token}
                                onChange={e => setWechatConfig({ ...wechatConfig, token: e.target.value })}
                                placeholder="请输入Token"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                消息加密AESKey（非必填）
                              </label>
                              <input
                                type="password"
                                value={wechatConfig.aesKey}
                                onChange={e => setWechatConfig({ ...wechatConfig, aesKey: e.target.value })}
                                placeholder="43位AES密钥"
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              二维码页面URL（选填）
                            </label>
                            <input
                              type="text"
                              value={wechatConfig.qrcodeUrl}
                              onChange={e => setWechatConfig({ ...wechatConfig, qrcodeUrl: e.target.value })}
                              placeholder="用于展示公众号二维码的页面URL"
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">接入说明</h4>
                            <ul className="text-sm text-green-600 dark:text-green-300 space-y-1">
                              <li>• 前往微信公众平台(https://mp.weixin.qq.com)注册公众号</li>
                              <li>• 在服务器配置中填写服务器地址（Token和AESKey可选填）</li>
                              <li>• 启用微信登录后，用户可在登录页面使用微信一键登录</li>
                              <li>• AppID和AppSecret可在基本配置中获取</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 数脉API配置 */}
                {activeTab === 'shumai' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 space-y-6"
                  >
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">数脉API配置</h2>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        AppID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={shumaiConfig.appId}
                        onChange={e => setShumaiConfig({ ...shumaiConfig, appId: e.target.value })}
                        placeholder="服务商分配的唯一标识"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        AppSecurity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={shumaiConfig.appSecurity}
                        onChange={e => setShumaiConfig({ ...shumaiConfig, appSecurity: e.target.value })}
                        placeholder="商户分配的app_security"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">接口说明</h4>
                      <ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1">
                        <li>• 用于人脸身份证比对认证（姓名+身份证号+人脸照片）</li>
                        <li>• 与公安库照片比对，返回匹配度分值</li>
                        <li>• 认证成功后用户身份标识将标记为"已认证"</li>
                        <li>• 如需开通请联系数脉API服务商获取密钥</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Save Button */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${saved ? 'text-green-600' : 'text-slate-400'}`}>
                    {saved ? '✓ 保存成功' : ''}
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    保存设置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
