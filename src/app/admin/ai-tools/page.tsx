"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Check, X, Trash2, Loader2, ExternalLink, Eye } from 'lucide-react';
import AdminLayout from '../AdminLayout';

interface AITool {
  id: string;
  name: string;
  description?: string;
  url?: string;
  icon?: string;
  category?: string;
  sort_order?: number;
  status: string;
  enabled: number;
  user_name?: string;
  user_phone?: string;
  created_at: string;
}

export default function AIToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editingTool, setEditingTool] = useState<AITool | null>(null);
  const [editForm, setEditForm] = useState<Partial<AITool>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTools();
  }, [activeTab]);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/ai-tools?status=${activeTab}`);
      const data = await response.json();
      if (data.success) {
        setTools(data.tools || []);
      }
    } catch (error) {
      console.error('获取AI工具失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tool: AITool) => {
    try {
      const response = await fetch('/api/admin/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', id: tool.id }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTools();
      }
    } catch (error) {
      console.error('批准失败:', error);
    }
  };

  const handleReject = async (tool: AITool) => {
    if (!confirm('确定要拒绝这个申请吗？')) return;
    try {
      const response = await fetch('/api/admin/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', id: tool.id }),
      });
      const data = await response.json();
      if (data.success) {
        fetchTools();
      }
    } catch (error) {
      console.error('拒绝失败:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个申请吗？')) return;
    try {
      const response = await fetch(`/api/admin/ai-tools?id=${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchTools();
      }
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleUpdate = async () => {
    if (!editingTool || !editForm.name?.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTool.id, ...editForm }),
      });
      const data = await response.json();
      if (data.success) {
        setEditingTool(null);
        setEditForm({});
        fetchTools();
      }
    } catch (error) {
      console.error('更新失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (icon?: string) => {
    const icons: Record<string, string> = {
      doubao: '🔵',
      deepseek: '🟣',
      kimi: '🟠',
      chatgpt: '🟢',
    };
    return icons[icon || ''] || '✨';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI 工具管理</h1>
            <p className="text-sm text-slate-500">管理 AI 工具的申请</p>
          </div>
        </div>

        {/* 状态标签 */}
        <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-purple-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            待审批 ({tools.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'approved'
                ? 'bg-purple-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            已批准 ({tools.filter(t => t.status === 'approved').length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'rejected'
                ? 'bg-purple-500 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            已拒绝 ({tools.filter(t => t.status === 'rejected').length})
          </button>
        </div>

        {/* 工具列表 */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin" />
            <p className="mt-2 text-slate-500">加载中...</p>
          </div>
        ) : tools.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-500">
            暂无 {getStatusLabel(activeTab)} 的申请
          </div>
        ) : (
          <div className="space-y-3">
            {tools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
              >
                {editingTool?.id === tool.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                      placeholder="工具名称"
                    />
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                      rows={2}
                      placeholder="工具描述"
                    />
                    <input
                      type="text"
                      value={editForm.url || ''}
                      onChange={(e) => setEditForm(f => ({ ...f, url: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                      placeholder="工具链接"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => { setEditingTool(null); setEditForm({}); }}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getIcon(tool.icon)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{tool.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tool.status)}`}>
                          {getStatusLabel(tool.status)}
                        </span>
                      </div>
                      {tool.description && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">{tool.description}</p>
                      )}
                      {tool.url && (
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {tool.url}
                        </a>
                      )}
                      {tool.category && (
                        <p className="mt-1 text-xs text-slate-400">分类：{tool.category}</p>
                      )}
                      {tool.user_name && (
                        <p className="mt-1 text-xs text-slate-400">申请人：{tool.user_name} {tool.user_phone && `(${tool.user_phone})`}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">申请时间：{new Date(tool.created_at).toLocaleString('zh-CN')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 待审批状态显示同意和拒绝按钮 */}
                      {tool.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(tool)}
                            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            title="同意"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(tool)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            title="拒绝"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {/* 已批准和已拒绝状态显示编辑和删除按钮 */}
                      {(tool.status === 'approved' || tool.status === 'rejected') && (
                        <>
                          <button
                            onClick={() => { setEditingTool(tool); setEditForm(tool); }}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(tool.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
