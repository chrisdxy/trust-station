"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Lock, ArrowRight, Check, Smartphone, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const LOGO_URL = "/logo.jpg";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  
  // 注册方式：password=密码注册, sms=短信验证码注册
  const [registerMethod, setRegisterMethod] = useState<'password' | 'sms'>('password');
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    verifyCode: '',
    agreedToTerms: false,
    agreedToPrivacy: false,
    agreedConsensus: false
  });
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  // 发送验证码
  const sendVerifyCode = async () => {
    if (!formData.phone || formData.phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    
    setSendingCode(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, type: 'register' })
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

  const handleRegister = async () => {
    if (!formData.phone || formData.phone.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }
    
    if (!formData.agreedToTerms) {
      setError('请阅读并同意《注册用户协议》');
      return;
    }
    if (!formData.agreedToPrivacy) {
      setError('请阅读并同意《隐私协议》');
      return;
    }
    if (!formData.agreedConsensus) {
      setError('请承诺遵循平台共识');
      return;
    }
    
    if (registerMethod === 'password') {
      if (!formData.password || formData.password.length < 6) {
        setError('密码至少6位');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('两次密码不一致');
        return;
      }
    } else {
      if (!formData.verifyCode || formData.verifyCode.length !== 6) {
        setError('请输入6位验证码');
        return;
      }
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          password: registerMethod === 'password' ? formData.password : undefined,
          verifyCode: registerMethod === 'sms' ? formData.verifyCode : undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 保存用户信息
        const userData = { 
          id: data.user.id,
          phone: formData.phone,
          password: registerMethod === 'password' ? formData.password : 'sms_verified',
          display_name: data.newUser?.display_name || '用户' + formData.phone.slice(-4),
          real_name: data.newUser?.real_name || null,
          user_type: data.newUser?.user_type || 'individual'
        };
        
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('user_data', JSON.stringify(userData));
        // 设置会话时间，跳转完善资料
        localStorage.setItem('login_session_time', Date.now().toString());
        router.push(`/complete-profile?source=register&token=${data.token}`);
      } else {
        setError(data.error || '注册失败');
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
            <Image 
              src={LOGO_URL} 
              alt="Logo" 
              width={32} 
              height={32} 
              className="w-full h-full object-cover"
              unoptimized
            />
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
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                注册
              </h1>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  手机号
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    placeholder="请输入11位手机号"
                  />
                </div>
              </div>

              {/* 注册方式切换 */}
              <div className="flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
                <button
                  onClick={() => setRegisterMethod('password')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    registerMethod === 'password'
                      ? 'bg-white dark:bg-slate-600 text-amber-600 shadow'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  密码注册
                </button>
                <button
                  onClick={() => setRegisterMethod('sms')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    registerMethod === 'sms'
                      ? 'bg-white dark:bg-slate-600 text-amber-600 shadow'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  验证码注册
                </button>
              </div>

              {/* 密码注册表单 */}
              {registerMethod === 'password' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      设置密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="至少6位字符"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      确认密码
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="再次输入密码"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 验证码注册表单 */}
              {registerMethod === 'sms' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      短信验证码
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={formData.verifyCode}
                          onChange={e => setFormData({ ...formData, verifyCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                          placeholder="6位验证码"
                        />
                      </div>
                      <button
                        onClick={sendVerifyCode}
                        disabled={sendingCode || countdown > 0}
                        className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                      >
                        {countdown > 0 ? `${countdown}s` : '获取验证码'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 用户协议 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl max-h-32 overflow-y-auto text-xs">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>《注册用户协议》</strong><br /><br />
                  <strong>一、服务条款的确认和接受</strong><br />
                  1. 正道驿站所有权和运营权归平台方所有。用户在使用本平台服务时，应遵守以下协议。<br />
                  2. 用户点击"注册"按钮即表示其完全理解、认同并接受本协议的全部内容。<br />
                  3. 平台有权随时修改本协议，修改后的协议一旦公布即生效。<br /><br />
                  <strong>二、用户注册及账号管理</strong><br />
                  1. 用户应年满18周岁，具有完全民事行为能力。<br />
                  2. 用户注册时应提供真实、准确、有效的个人信息，并及时更新。<br />
                  3. 用户须设置安全的账号密码，因个人保管不善造成的损失由用户自行承担。<br />
                  4. 一个手机号仅限注册一个账号，用户不得借用、转让账号。<br /><br />
                  <strong>三、用户行为规范</strong><br />
                  1. 用户承诺发布的信息真实、合法，不得含有违法、违规内容。<br />
                  2. 用户应遵循正向思考、建设性沟通原则，维护良好的平台氛围。<br />
                  3. 禁止发布虚假信息、进行欺诈行为、侵犯他人合法权益。<br />
                  4. 禁止以任何方式干扰平台正常运行或破坏平台系统。<br /><br />
                  <strong>四、免责声明</strong><br />
                  1. 平台不对用户发布的信息真实性负责，用户需自行判断。<br />
                  2. 因不可抗力导致的服务中断，平台不承担责任。<br />
                  3. 用户因违反本协议造成的任何第三方损失，由用户自行承担责任。<br /><br />
                  <strong>五、协议修改</strong><br />
                  平台有权在必要时修改协议内容，修改后的协议公布后即生效。继续使用服务视为接受修改后的协议。
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreedToTerms}
                  onChange={e => setFormData({ ...formData, agreedToTerms: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-slate-300"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  我已阅读并同意《注册用户协议》
                </span>
              </label>

              {/* 隐私协议 */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl max-h-32 overflow-y-auto text-xs">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>《隐私协议》</strong><br /><br />
                  <strong>一、信息收集</strong><br />
                  1. 我们收集您主动提供的信息，包括手机号、昵称、真实姓名等注册信息。<br />
                  2. 我们收集您使用服务时自动生成的信息，包括设备信息、登录日志、操作记录等。<br />
                  3. 我们收集您在使用平台功能时主动上传的内容，包括心性档案、项目信息等。<br /><br />
                  <strong>二、信息使用</strong><br />
                  1. 用于为您提供账号注册、身份验证等基础服务。<br />
                  2. 用于向您推送平台动态、活动通知等重要信息。<br />
                  3. 用于改善平台服务、优化用户体验、开展数据分析。<br />
                  4. 根据法律法规要求，用于安全审计、违规查处等合规用途。<br /><br />
                  <strong>三、信息共享</strong><br />
                  1. 未经您同意，我们不会向第三方出售、转让您的个人信息。<br />
                  2. 在以下情况下，我们可能共享您的信息：法律法规要求、司法机关要求、保护公共安全等。<br />
                  3. 与平台合作的服务商在严格保密前提下协助提供服务。<br /><br />
                  <strong>四、信息保护</strong><br />
                  1. 我们采用业界领先的安全技术保护您的个人信息。<br />
                  2. 我们对敏感信息采取加密存储、访问控制等保护措施。<br />
                  3. 您可通过账号设置查看、管理您的个人信息。<br /><br />
                  <strong>五、您的权利</strong><br />
                  1. 您有权知悉我们收集了哪些您的信息。<br />
                  2. 您有权更正、删除您的个人信息。<br />
                  3. 您有权注销账号，注销后我们将删除您的个人信息（法律法规另有规定的除外）。<br /><br />
                  <strong>六、未成年人保护</strong><br />
                  我们不建议未满18周岁的未成年人注册使用本平台。未成年人请在监护人陪同下使用。
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreedToPrivacy}
                  onChange={e => setFormData({ ...formData, agreedToPrivacy: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-slate-300"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  我已阅读并同意《隐私协议》
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreedConsensus}
                  onChange={e => setFormData({ ...formData, agreedConsensus: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-slate-300"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  我同意平台六个卡片公布的根本共识、沟通共识、心性成长、行为留痕、伙伴优选和平台存档六条规则
                </span>
              </label>

              <motion.button
                onClick={handleRegister}
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <>
                    注册
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                已有账号？{' '}
                <Link href="/login" className="text-amber-600 hover:text-amber-700 font-medium">
                  立即登录
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
