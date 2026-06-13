'use client';
import { useState } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';

interface AIWriterProps {
  onResult: (text: string) => void;
  prompt: string;
  context?: string;
  label?: string;
  placeholder?: string;
  buttonText?: string;
}

export default function AIWriter({ onResult, prompt, context, label, placeholder, buttonText }: AIWriterProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setPreview('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', prompt: `${prompt}\n\n用户补充：${input || '无'}\n\n生成要求：直接返回内容，无需额外说明。`, context: context || '' }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.result);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleApply = () => {
    if (preview) onResult(preview);
    setOpen(false);
    setPreview('');
    setInput('');
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:text-purple-300 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {buttonText || 'AI 写作'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-500" />{label || 'AI 写作助手'}
            </span>
            <button onClick={() => { setOpen(false); setPreview(''); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder || '补充关键词或要求（可选）...'} rows={3}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 resize-none outline-none focus:ring-2 focus:ring-purple-500 mb-2"
          />
          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? '生成中...' : '生成内容'}
          </button>
          {preview && (
            <div className="mt-3">
              <div className="text-xs text-slate-500 mb-1">预览：</div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">{preview}</div>
              <button onClick={handleApply}
                className="mt-2 w-full py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />应用此内容
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
