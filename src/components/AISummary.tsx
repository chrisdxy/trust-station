'use client';
import { useState } from 'react';
import { Sparkles, Loader2, FileText, X } from 'lucide-react';

interface AISummaryProps {
  content: string;
  context?: string;
  prompt?: string;
  label?: string;
  onResult?: (text: string) => void;
}

export default function AISummary({ content, context, prompt, label, onResult }: AISummaryProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const handleSummarize = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    setSummary('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summary',
          content: content,
          prompt: prompt || '请用简洁的语言总结以上内容，提取关键信息。返回格式：关键要点（每行一个要点）。',
          context: context || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.result);
        onResult?.(data.result);
      } else {
        setError(data.error || '总结失败');
      }
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => { setShow(!show); if (!show && !summary) handleSummarize(); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {label || 'AI 摘要'}
      </button>
      {show && (
        <div className="mt-2 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />AI 智能摘要
            </span>
            <button onClick={() => setShow(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-2"><Loader2 className="w-4 h-4 animate-spin" />AI 分析中...</div>
          ) : error ? (
            <div className="text-sm text-red-500 py-2">{error}</div>
          ) : (
            <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{summary}</div>
          )}
        </div>
      )}
    </div>
  );
}
