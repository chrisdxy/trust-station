'use client';
import { useState, useCallback } from 'react';

interface AIOptions {
  action?: 'generate' | 'summary' | 'match' | 'analyze';
  prompt?: string;
  content?: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const call = useCallback(async (options: AIOptions) => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: options.action || 'generate',
          prompt: options.prompt,
          content: options.content,
          context: options.context,
          maxTokens: options.maxTokens,
          temperature: options.temperature,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.result);
        return data.result;
      } else {
        setError(data.error || 'AI 请求失败');
        return '';
      }
    } catch (err: any) {
      setError(err.message || '网络错误');
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult('');
    setError('');
  }, []);

  return { loading, result, error, call, clear };
}
