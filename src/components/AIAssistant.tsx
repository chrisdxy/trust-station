"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 可爱的卡通 SVG 头像
const CuteAvatar = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 身体 */}
    <circle cx="50" cy="58" r="32" fill="url(#bodyGrad)" />
    {/* 头部 */}
    <ellipse cx="50" cy="32" rx="28" ry="26" fill="url(#headGrad)" />
    {/* 耳朵 */}
    <ellipse cx="26" cy="18" rx="10" ry="12" fill="url(#earGrad)" transform="rotate(-15, 26, 18)" />
    <ellipse cx="74" cy="18" rx="10" ry="12" fill="url(#earGrad)" transform="rotate(15, 74, 18)" />
    {/* 耳朵内部 */}
    <ellipse cx="28" cy="20" rx="5" ry="7" fill="#FFB6C1" opacity="0.6" transform="rotate(-15, 28, 20)" />
    <ellipse cx="72" cy="20" rx="5" ry="7" fill="#FFB6C1" opacity="0.6" transform="rotate(15, 72, 20)" />
    {/* 眼睛 */}
    <ellipse cx="38" cy="30" rx="6" ry="7" fill="white" />
    <ellipse cx="62" cy="30" rx="6" ry="7" fill="white" />
    <circle cx="39" cy="31" r="4" fill="#2D1B69" />
    <circle cx="63" cy="31" r="4" fill="#2D1B69" />
    <circle cx="41" cy="29" r="1.5" fill="white" />
    <circle cx="65" cy="29" r="1.5" fill="white" />
    {/* 腮红 */}
    <ellipse cx="28" cy="38" rx="7" ry="4" fill="#FFB6C1" opacity="0.5" />
    <ellipse cx="72" cy="38" rx="7" ry="4" fill="#FFB6C1" opacity="0.5" />
    {/* 嘴巴 */}
    <path d="M42 42 Q50 50 58 42" stroke="#2D1B69" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* 胡须 */}
    <line x1="18" y1="36" x2="30" y2="38" stroke="#2D1B69" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <line x1="16" y1="42" x2="28" y2="42" stroke="#2D1B69" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <line x1="70" y1="38" x2="82" y2="36" stroke="#2D1B69" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    <line x1="72" y1="42" x2="84" y2="42" stroke="#2D1B69" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    {/* 小手 */}
    <ellipse cx="24" cy="62" rx="8" ry="6" fill="url(#pawGrad)" />
    <ellipse cx="76" cy="62" rx="8" ry="6" fill="url(#pawGrad)" />
    {/* 肉垫 */}
    <circle cx="24" cy="60" r="2.5" fill="#FFB6C1" opacity="0.5" />
    <circle cx="76" cy="60" r="2.5" fill="#FFB6C1" opacity="0.5" />
    {/* 渐变定义 */}
    <defs>
      <linearGradient id="bodyGrad" x1="30" y1="40" x2="70" y2="80">
        <stop stopColor="#FFE4B5" />
        <stop offset="1" stopColor="#FFD700" />
      </linearGradient>
      <linearGradient id="headGrad" x1="25" y1="10" x2="75" y2="55">
        <stop stopColor="#FFE4B5" />
        <stop offset="1" stopColor="#FFD700" />
      </linearGradient>
      <linearGradient id="earGrad" x1="20" y1="10" x2="30" y2="25">
        <stop stopColor="#FFD700" />
        <stop offset="1" stopColor="#FFA500" />
      </linearGradient>
      <linearGradient id="pawGrad" x1="18" y1="58" x2="30" y2="66">
        <stop stopColor="#FFD700" />
        <stop offset="1" stopColor="#FFA500" />
      </linearGradient>
    </defs>
  </svg>
);

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好呀！我是小智 🐱✨ 有什么问题需要帮忙的吗？比如平台的玩法、功能使用，或者任何你想了解的～' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我暂时无法回答这个问题，请稍后再试试哦 😊' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '网络好像出了点问题，等会儿再问我吧 🙈' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 浮动按钮 */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {/* 气泡提示 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute -top-12 right-0 bg-white dark:bg-slate-800 shadow-lg rounded-2xl px-4 py-2 whitespace-nowrap border border-amber-200 dark:border-amber-700"
        >
          {/* 气泡箭头 */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white dark:bg-slate-800 border-r border-b border-amber-200 dark:border-amber-700 rotate-45" />
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">有问题可问我哦 💡</span>
          </div>
        </motion.div>

        {/* 头像 */}
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-pink-400 p-0.5 shadow-[0_4px_20px_rgba(251,146,60,0.4)] group-hover:shadow-[0_6px_30px_rgba(251,146,60,0.6)] transition-shadow">
            <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
              <CuteAvatar size={56} />
            </div>
          </div>
          {/* 脉冲动画 */}
          <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/20" />
          {/* 在线绿点 */}
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white dark:border-slate-800 rounded-full" />
        </div>
      </motion.button>

      {/* 对话框 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
          >
            {/* 头部 */}
            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                    <CuteAvatar size={36} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-1">
                      小智
                      <Sparkles className="w-3.5 h-3.5" />
                    </h3>
                    <p className="text-xs text-white/80">在线 · 随时为您解答</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mr-2 self-end">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center">
                        <CuteAvatar size={24} />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex-shrink-0 mr-2 self-end">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center">
                      <CuteAvatar size={24} />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl px-3 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的问题..."
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                小智由 AI 驱动，回答仅供参考
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
