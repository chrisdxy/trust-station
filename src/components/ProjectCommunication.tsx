"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Send, User, Loader2, ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface Message {
  id: number;
  project_id: string;
  sender_id: string;
  content: string;
  is_from_creator: number;
  created_at: string;
  sender_name?: string;
}

interface Conversation {
  senderId: string;
  senderName: string;
  totalCount: number;
  lastMessage: Message;
  lastTime: string;
}

export default function ProjectCommunication({
  projectId,
  creatorId,
  creatorName,
}: {
  projectId: string;
  creatorId: string;
  creatorName: string;
}) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [expandedSender, setExpandedSender] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userId = currentUser?.id || '';
  const displayName = currentUser?.display_name || currentUser?.real_name || currentUser?.nickname || currentUser?.phone?.slice(-4) || '用户';
  const isProjectCreator = userId === creatorId;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchMessages();
  }, [userId, projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages?userId=${userId}&projectUserId=${creatorId}`);
      const data = await res.json();
      if (data.success) {
        setIsCreator(data.isCreator);
        setMessages(data.messages || []);
        if (data.conversations) {
          setConversations(data.conversations);
          // 默认展开第一个对话
          if (data.conversations.length > 0 && !expandedSender) {
            setExpandedSender(data.conversations[0].senderId);
          }
        }
      }
    } catch (err) {
      console.error('获取消息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content: text,
          creatorId,
          senderName: displayName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInput('');
        fetchMessages();
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch (err) {
      console.error('发送失败:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 获取某个发送者的消息（创建者视角）
  const getSenderMessages = (senderId: string) => {
    return messages.filter(m => m.sender_id === senderId || (m.is_from_creator && m.sender_id === senderId));
  };

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (!userId) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
        <div className="text-center text-sm text-slate-400 py-4">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p>登录后可参与项目沟通</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6 overflow-hidden">
      {/* 标题 */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
        <MessageSquare className="w-5 h-5 text-amber-500" />
        <h2 className="font-semibold text-slate-900 dark:text-white">项目沟通区</h2>
        <span className="text-xs text-slate-400 ml-auto">
          {isProjectCreator ? '创建者视角 · 管理所有沟通' : '私密沟通 · 仅创建者可见'}
        </span>
      </div>

      {/* 创建者视图：按发送者分组显示对话列表 */}
      {isProjectCreator ? (
        <div>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-200 dark:text-slate-600" />
              <p>暂无沟通消息</p>
              <p className="text-xs mt-1">当有其他用户发送消息时，将在此显示</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {conversations.map((conv) => {
                const isExpanded = expandedSender === conv.senderId;
                const senderMsgs = messages.filter(
                  m => m.sender_id === conv.senderId || (m.is_from_creator && m.sender_id === conv.senderId)
                );

                return (
                  <div key={conv.senderId}>
                    {/* 对话标题 */}
                    <button
                      onClick={() => setExpandedSender(isExpanded ? null : conv.senderId)}
                      className="w-full flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                          {conv.senderName[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                            {conv.senderName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {conv.totalCount} 条
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {conv.lastMessage?.content?.substring(0, 50)}
                          {conv.lastMessage?.content?.length > 50 ? '...' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-slate-400">{formatTime(conv.lastTime)}</span>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>

                    {/* 展开的对话内容 */}
                    {isExpanded && (
                      <div className="bg-slate-50 dark:bg-slate-900/50">
                        <div className="px-6 py-3 max-h-72 overflow-y-auto space-y-3">
                          {senderMsgs.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-2">暂无消息</p>
                          ) : (
                            senderMsgs.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${msg.is_from_creator ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                    msg.is_from_creator
                                      ? 'bg-amber-500 text-white rounded-br-md'
                                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm rounded-bl-md'
                                  }`}
                                >
                                  <p>{msg.content}</p>
                                  <p className={`text-[10px] mt-1 ${msg.is_from_creator ? 'text-white/70' : 'text-slate-400'}`}>
                                    {formatTime(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* 创建者回复输入框 */}
                        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <input
                              ref={inputRef}
                              type="text"
                              value={expandedSender === conv.senderId ? input : ''}
                              onChange={e => setInput(e.target.value)}
                              onKeyDown={handleKeyDown}
                              placeholder={`回复 ${conv.senderName}...`}
                              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              onClick={handleSend}
                              disabled={!input.trim() || sending}
                              className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-40"
                            >
                              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* 非创建者视图：只显示自己和创建者的对话 */
        <div>
          {/* 消息列表 */}
          <div className="px-6 py-4 max-h-80 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-200 dark:text-slate-600" />
                <p className="text-sm text-slate-400">暂无沟通记录</p>
                <p className="text-xs text-slate-400 mt-1">发送消息后，创建者将收到通知</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.sender_id === userId
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-slate-700 dark:text-slate-200 rounded-bl-md'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-white/60' : 'text-slate-400'}`}>
                      {msg.is_from_creator ? `${creatorName} · ` : ''}{formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 发送消息 */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`向 ${creatorName} 发送消息...`}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
