"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle, Smartphone, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const LOGO_URL = "/logo.jpg";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  
  const [step, setStep] = useState<'phone' | 'verify' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
        body: JSON.stringify({ phone, type: 'reset' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCountdown(60);
        setStep('verify');
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

  // 验证验证码
  const verifyCodeHandler = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setError('请输入6位验证码');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, verifyCode, type: 'reset' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResetToken(data.token);
        setStep('reset');
      } else {
        setError(data.error || '验证码验证失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 重置密码
  const resetPasswordHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      setError('密码至少6位');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/reset-password-phone', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resetToken}`,
        },
        body: JSON.stringify({ phone, password: newPassword }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || '重置失败');
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
            {/* Back Link */}
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">返回登录</span>
            </Link>

            {success ? (
              // Success State
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </motion.div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  密码重置成功
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  您可以使用新密码登录了
                </p>
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                  前往登录
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              // Form Steps
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {step === 'phone' && '验证手机号'}
                    {step === 'verify' && '输入验证码'}
                    {step === 'reset' && '设置新密码'}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                    {step === 'phone' && '请输入您注册的手机号'}
                    {step === 'verify' && `验证码已发送至 ${phone}`}
                    {step === 'reset' && '请设置您的新密码'}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Step 1: Phone */}
                {step === 'phone' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        手机号
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          placeholder="请输入11位手机号"
                        />
                      </div>
                    </div>

                    <motion.button
                      onClick={sendVerifyCode}
                      disabled={sendingCode || countdown > 0}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {sendingCode ? (
                        <span className="animate-spin">⟳</span>
                      ) : (
                        <>
                          获取验证码
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                )}

                {/* Step 2: Verify Code */}
                {step === 'verify' && (
                  <div className="space-y-4">
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
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                            placeholder="6位验证码"
                          />
                        </div>
                        <button
                          onClick={sendVerifyCode}
                          disabled={sendingCode || countdown > 0}
                          className="px-4 py-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap"
                        >
                          {countdown > 0 ? `${countdown}s` : '重新获取'}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      onClick={verifyCodeHandler}
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="animate-spin">⟳</span>
                      ) : (
                        <>
                          验证
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>

                    <button
                      onClick={() => setStep('phone')}
                      className="w-full py-2 text-slate-500 dark:text-slate-400 text-sm"
                    >
                      重新输入手机号
                    </button>
                  </div>
                )}

                {/* Step 3: Reset Password */}
                {step === 'reset' && (
                  <form onSubmit={resetPasswordHandler} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        新密码
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-4 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          placeholder="至少6位字符"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        确认密码
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          placeholder="再次输入密码"
                          required
                          minLength={6}
                        />
                      </div>
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
                          重置密码
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
