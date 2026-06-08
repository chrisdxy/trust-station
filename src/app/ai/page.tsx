"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, ExternalLink, Grid, List, Filter, X, Plus, Copy, Check, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

// AI工具类型
interface AITool {
  id: string;
  name: string;
  description?: string;
  url?: string;
  icon?: string;
  category?: string;
  sort_order?: number;
  enabled: number;
  status: string;
}

// 分类配置：从数据库读取，仅保留 icon/color 映射
const categoryIconMap: Record<string, { icon: string; color: string }> = {
  '大语言模型': { icon: '💬', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  '图像生成':   { icon: '🎨', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
  '视频生成':   { icon: '🎬', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  '音频处理':   { icon: '🎵', color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' },
  '代码助手':   { icon: '💻', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  '数据处理':   { icon: '📊', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  '搜索与研究': { icon: '🔍', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  '内容创作':   { icon: '✍️', color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' }
};

export default function AIToolsPage() {
  const { t } = useLanguage();
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '', url: '', category: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 加载分类列表（从后台读取）
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetch('/api/categories?type=ai_tool');
      const data = await response.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories.map((c: any) => c.name));
      }
    } catch (error) {
      console.error('获取AI工具分类失败:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // 加载数据
  useEffect(() => {
    fetchTools();
    fetchCategories();
  }, []);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ai-tools?enabled=true');
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

  const handleSubmit = async () => {
    if (!addForm.name.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm)
      });
      const data = await response.json();
      if (data.success) {
        setSubmitSuccess(true);
        setShowAddForm(false);
        setAddForm({ name: '', description: '', url: '', category: '' });
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 过滤工具
  const filteredTools = tools.filter(tool => {
    const matchSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (tool.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || tool.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  // 复制链接
  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (icon?: string) => {
    const icons: Record<string, string> = {
      doubao: '🔵',
      deepseek: '🟣',
      kimi: '🟠',
      chatgpt: '🟢'
    };
    return icons[icon || ''] || '✨';
  };

  const getIconGradient = (icon?: string) => {
    const gradients: Record<string, string> = {
      doubao: 'from-orange-500 to-orange-600',
      deepseek: 'from-slate-700 to-slate-800',
      kimi: 'from-purple-500 to-purple-600',
      chatgpt: 'from-green-500 to-green-600'
    };
    return gradients[icon || ''] || 'from-amber-500 to-orange-500';
  };

  // 统计信息
  const stats = {
    total: tools.length,
    categories: categories.length
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 rounded-3xl" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl" />
          
          <div className="relative p-8 md:p-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                  AI 工具集
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  发现优质AI工具，提升工作效率
                </p>
              </div>
            </div>
            
            {/* 统计卡片 */}
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-slate-500">工具数量</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-sm">
                  <Filter className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.categories}</p>
                  <p className="text-sm text-slate-500">分类数量</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                添加工具
              </button>
            </div>
          </div>
        </motion.div>

        {/* Search & Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-6 shadow-sm"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索AI工具..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            
            {/* 分类筛选 */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  !selectedCategory
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                全部
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {categoryIconMap[cat]?.icon || '🔧'} {cat}
                </button>
              ))}
            </div>

            {/* 视图切换 */}
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
              >
                <Grid size={18} className={viewMode === 'grid' ? 'text-amber-500' : 'text-slate-400'} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}
              >
                <List size={18} className={viewMode === 'list' ? 'text-amber-500' : 'text-slate-400'} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tools Display */}
        {filteredTools.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {searchTerm || selectedCategory ? '未找到匹配的AI工具' : '暂无AI工具'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm || selectedCategory ? '尝试调整搜索条件或筛选器' : '管理员尚未添加AI工具'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
              : 'space-y-3'
            }
          >
            {filteredTools.map((tool, index) => {
              const iconStr = getIcon(tool.icon);
              const gradient = getIconGradient(tool.icon);
              const catCfg = categoryIconMap[tool.category || ''] || { icon: '🔧', color: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400' };
              
              if (viewMode === 'list') {
                return (
                  <motion.a
                    key={tool.id}
                    href={tool.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group flex items-center gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                      {tool.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{tool.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${catCfg.color}`}>{catCfg.icon} {tool.category}</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{tool.description || '暂无描述'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {tool.url && (
                        <button
                          onClick={e => { e.preventDefault(); handleCopy(tool.url || '', tool.id); }}
                          className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                          {copiedId === tool.id ? <Check size={18} /> : <Copy size={18} />}
                        </button>
                      )}
                      <ExternalLink size={18} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    </div>
                  </motion.a>
                );
              }

              return (
                <motion.a
                  key={tool.id}
                  href={tool.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`h-24 bg-gradient-to-br ${gradient} relative p-4`}>
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-1 bg-white/20 backdrop-blur rounded-lg text-xs text-white">
                        {catCfg.icon}
                      </span>
                    </div>
                    <div className="absolute -bottom-6 left-4">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-amber-500 font-bold text-xl shadow-lg">
                        {tool.name.charAt(0)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 pt-8">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                        {tool.name}
                      </h3>
                      {tool.url && (
                        <ExternalLink size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                      {tool.description || '暂无描述'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 text-xs rounded-full ${catCfg.color}`}>
                        {tool.category}
                      </span>
                      {tool.url && (
                        <button
                          onClick={e => { e.preventDefault(); handleCopy(tool.url || '', tool.id); }}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        >
                          {copiedId === tool.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.a>
              );
            })}
          </motion.div>
        )}

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <p className="text-sm text-slate-400">
            点击卡片直接访问AI工具 · 支持复制链接分享
          </p>
        </motion.div>
      </div>

      {/* 添加工具弹窗 */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">添加工具</h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">提交后需要管理员审核通过才会显示在工具列表中</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    工具名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="请输入工具名称"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    工具描述
                  </label>
                  <textarea
                    value={addForm.description}
                    onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="请输入工具描述"
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    工具链接
                  </label>
                  <input
                    type="url"
                    value={addForm.url}
                    onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    分类
                  </label>
                  <select
                    value={addForm.category}
                    onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  >
                    <option value="">请选择分类</option>
                    {categoriesLoading ? (
                      <option disabled>加载中...</option>
                    ) : (
                      categories.map(cat => (
                        <option key={cat} value={cat}>{categoryIconMap[cat]?.icon || '🔧'} {cat}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !addForm.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      提交申请
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提交成功提示 */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg"
          >
            提交成功！请等待管理员审核
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
