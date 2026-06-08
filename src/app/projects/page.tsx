"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, MapPin, Calendar, X, Bold, Italic, List, Link, Image, Upload, Users, UserPlus, Trash2, Edit, Pause, Play, CheckCircle, Search, Star, ChevronDown, Copy } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories, Category } from '@/hooks/useCategories';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { WeChatShareSetup } from '@/components/WeChatShareSetup';

// Simple Toast Component
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface Project {
  id: string;
  title: string;
  status: string;
  location: string;
  industry: string;
  types: string[];
  description: string;
  summary?: string;
  images: string[];
  date: string;
  createdAt?: string;
  members: string[];
  creatorId?: string;
  paused?: boolean;
  isDueDiligence?: boolean;
  dueDiligenceDetails?: string;
  coverImage?: string;
  qr_code?: string;
}

export default function ProjectsPage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorImageRef = useRef<HTMLInputElement>(null);
  
  // State variables
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  
  // Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'created' | 'following'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dueDiligenceFilter, setDueDiligenceFilter] = useState<'none' | 'due' | 'not_due'>('not_due');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    industry: '',
    types: [] as string[],
    description: '',
    summary: '',
    coverImage: '',
    images: [] as string[],
    members: [] as string[],
    isDueDiligence: false,
    dueDiligenceDetails: '',
  });
  
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  
  // 安全日期格式化
  const safeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN');
  };

  // 短项目ID
  const getShortProjectId = (id: string) => {
    return 'PRJ-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };
  
  // Toast helper
  const toast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  // Load projects
  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };
  
  // Load current user
  useEffect(() => {
    let userId = '';
    // 1. 尝试从 localStorage 获取用户信息
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.id) userId = user.id;
      } catch {}
    }
    
    if (userId) {
      setCurrentUserId(userId);
      setIsAuthChecked(true);
      return;
    }
    
    // 2. 尝试从 API 获取
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user?.id) {
          setCurrentUserId(data.user.id);
        }
      })
      .catch(err => console.error('Failed to load user:', err))
      .finally(() => setIsAuthChecked(true));
  }, []);
  
  // Load projects only after auth check
  useEffect(() => {
    if (isAuthChecked && currentUserId) {
      loadProjects();
    }
  }, [isAuthChecked, currentUserId]);
  
  // Handle cover image upload
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImagePreview((e.target as FileReader).result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, coverImage: data.url }));
        // 上传成功后重置文件输入框，防止手机端显示长文件名
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        toast(data.error || '上传失败');
        console.error('Upload failed:', data.error);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast('图片上传失败，请重试');
    }
  };

  // 安全格式化日期（处理 null/undefined/Invalid Date）
  const formatSafeDate = (value: string | null | undefined): string => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('zh-CN');
  };

  // 简易 Markdown → HTML（支持图片、链接、粗体）
  const renderDescription = (text: any) => {
    if (!text || typeof text !== 'string') return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match: string, alt: string, url: string) => {
      const fullUrl = url.startsWith('/') ? 'https://myfriends.vip' + url : url;
      return `<img src="${fullUrl}" alt="${alt}" style="max-width:100%;height:auto;margin:8px 0;border-radius:8px" />`;
    });
    html = html.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match: string, text: string, url: string) => {
      const fullUrl = url.startsWith('/') ? 'https://myfriends.vip' + url : url;
      return `<a href="${fullUrl}" target="_blank" style="color:#3b82f6;text-decoration:underline">${text}</a>`;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  };

  // Remove cover image
  const removeCoverImage = () => {
    setCoverImagePreview(null);
    setFormData(prev => ({ ...prev, coverImage: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle editor image upload
  const handleEditorImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          const textarea = document.getElementById('project-description') as HTMLTextAreaElement;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + `![image](${data.url})` + text.substring(end);
            setFormData(prev => ({ ...prev, description: newText }));
          }
        } else {
          toast(data.error || '图片上传失败');
        }
      } catch (err) {
        console.error('Upload failed:', err);
        toast('图片上传失败，请重试');
      }
    }
    // 重置文件输入框，防止手机端显示长文件名
    if (editorImageRef.current) editorImageRef.current.value = '';
  };
  
  // Format text helper
  const formatText = (format: string) => {
    const textarea = document.getElementById('project-description') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    let formatted = '';
    
    switch (format) {
      case 'bold':
        formatted = `**${text.substring(start, end) || '粗体文字'}**`;
        break;
      case 'italic':
        formatted = `*${text.substring(start, end) || '斜体文字'}*`;
        break;
      case 'list':
        formatted = `\n- ${text.substring(start, end) || '列表项'}`;
        break;
      case 'link':
        const url = prompt('请输入链接地址:', 'https://');
        if (url) {
          formatted = `[${text.substring(start, end) || '链接文字'}](${url})`;
        } else {
          return;
        }
        break;
    }
    
    const newText = text.substring(0, start) + formatted + text.substring(end);
    setFormData(prev => ({ ...prev, description: newText }));
  };
  
  // Add/remove members via UserSelect multi-select
  const addMember = (user: UserSearchResult) => {
    const name = user.real_name || user.display_name || '用户';
    setSelectedMembers(prev => [...prev, user]);
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(name) ? prev.members : [...prev.members, name],
    }));
  };

  const removeMember = (member: string) => {
    setSelectedMembers(prev => prev.filter(u => (u.real_name || u.display_name) !== member));
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m !== member),
    }));
  };
  
  // Handle create/update project
  const handleCreateProject = async () => {
    if (!formData.title.trim()) {
      toast('请输入项目名称');
      return;
    }
    
    if (!currentUserId) {
      toast('请先登录');
      return;
    }
    
    if (editingProject) {
      // Update mode
      try {
        const res = await fetch(`/api/projects?id=${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            coverImage: formData.coverImage,
            images: formData.images,
            projectTypes: formData.types,
            industry: formData.industry,
            location: formData.location,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await loadProjects();
          setSelectedProject(null);
          setEditingProject(null);
          setFormData({ title: '', location: '', industry: '', types: [], description: '', summary: '', coverImage: '', images: [], members: [], isDueDiligence: false, dueDiligenceDetails: '' });
          setShowModal(false);
          toast('项目已更新');
        } else {
          toast(data.error || '更新失败');
        }
      } catch (err) {
        console.error('更新项目失败:', err);
        toast('更新失败');
      }
    } else {
      // Create mode
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUserId,
            title: formData.title,
            description: formData.description,
            coverImage: formData.coverImage,
            projectTypes: formData.types,
            industry: formData.industry,
            location: formData.location,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await loadProjects();
          setCreatedProjectId(data.id);
          setFormData({ title: '', location: '', industry: '', types: [], description: '', summary: '', coverImage: '', images: [], members: [], isDueDiligence: false, dueDiligenceDetails: '' });
          setShowModal(false);
        } else {
          toast(data.error || '创建失败');
        }
      } catch (err) {
        console.error('创建项目失败:', err);
        toast('创建失败');
      }
    }
  };
  
  // Categories
  const categories = useCategories();
  const industryOptions: string[] = categories['project_industry']?.map((c: Category) => c.name) || [];
  const typeOptions: string[] = categories['project_type']?.map((c: Category) => c.name) || [];
  
  // Filter projects based on all filter criteria
  const filteredProjects = projects.filter(project => {
    // Tab filter
    if (activeTab === 'created' && project.creatorId !== currentUserId) return false;
    // Note: 'following' tab needs backend support for follow status
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        project.title.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query) ||
        project.industry.toLowerCase().includes(query) ||
        project.types.some(t => t.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    // Due diligence filter
    if (dueDiligenceFilter === 'due' && !project.isDueDiligence) return false;
    if (dueDiligenceFilter === 'not_due' && project.isDueDiligence) return false;
    
    // Project type filter
    if (selectedTypes.length > 0 && !project.types.some(t => selectedTypes.includes(t))) return false;
    
    return true;
  });
  
  return (
    <Layout>
      {!isAuthChecked ? (
        <div className="max-w-6xl mx-auto py-20 text-center">
          <p className="text-slate-500">加载中...</p>
        </div>
      ) : !currentUserId ? (
        <div className="max-w-6xl mx-auto py-20 text-center">
          <h2 className="text-xl font-bold text-slate-700 mb-2">请先登录</h2>
          <p className="text-slate-500">项目中心需要登录后才能访问</p>
        </div>
      ) : (
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('projects.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {t('projects.description')}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              创建项目
            </button>
          </div>
        </motion.div>
        
        {/* Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 space-y-4"
        >
          {/* Tabs: 全部、我创建的、我关注的 */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: '全部' },
              { key: 'created', label: '我创建的' },
              { key: 'following', label: '我关注的' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'all' | 'created' | 'following')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Due Diligence Filter & Project Type Filter */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            {/* 是否尽调 - Radio buttons */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                是否尽调
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dueDiligenceFilter"
                    checked={dueDiligenceFilter === 'not_due'}
                    onChange={() => setDueDiligenceFilter('not_due')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">未经尽调</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dueDiligenceFilter"
                    checked={dueDiligenceFilter === 'due'}
                    onChange={() => setDueDiligenceFilter('due')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">已经尽调</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dueDiligenceFilter"
                    checked={dueDiligenceFilter === 'none'}
                    onChange={() => setDueDiligenceFilter('none')}
                    className="w-4 h-4 text-amber-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">全部</span>
                </label>
              </div>
            </div>

            {/* 项目类型 - Multi-select checkboxes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                项目类型
              </label>
              <div className="flex flex-wrap gap-2">
                {typeOptions.map((opt: string) => (
                  <label
                    key={opt}
                    className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                      selectedTypes.includes(opt)
                        ? 'bg-amber-500 text-white'
                        : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(opt)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes([...selectedTypes, opt]);
                        } else {
                          setSelectedTypes(selectedTypes.filter(t => t !== opt));
                        }
                      }}
                      className="sr-only"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Success Modal for Created Project ID */}
        <AnimatePresence>
          {createdProjectId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
              onClick={() => setCreatedProjectId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">项目创建成功</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-2">项目ID:</p>
                <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4">
                  <code className="text-sm text-amber-600 dark:text-amber-400">{getShortProjectId(createdProjectId)}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdProjectId);
                      toast('已复制到剪贴板');
                    }}
                    className="ml-auto p-1 text-slate-500 hover:text-slate-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setCreatedProjectId(null)}
                  className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                >
                  确定
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Project List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {filteredProjects.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无项目，点击上方按钮创建</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedProject(project)}
                >
                  {project.coverImage && (
                    <div className="h-48 overflow-hidden">
                      <img 
                        src={project.coverImage} 
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {project.title}
                      </h3>
                      {project.isDueDiligence && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          尽调
                        </span>
                      )}
                      {project.types && project.types.map((t: string) => (
                        <span key={t} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono cursor-pointer hover:bg-amber-200 transition-colors mb-2"
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getShortProjectId(project.id)).then(() => {}) }}
                      title="点击复制项目ID，用于记录中心查询">
                      项目ID: {getShortProjectId(project.id)}
                    </span>
                    <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{project.summary || ''}</div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {safeDate(project.date)}
                      </span>
                    </div>
                    {/* 删除按钮 — 仅创建者可见 */}
                    {currentUserId && project.creatorId === currentUserId && (
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm('确定删除该项目？')) return;
                            fetch(`/api/projects?id=${project.id}`, { method: 'DELETE' })
                              .then(r => r.json())
                              .then(data => {
                                if (data.success) {
                                  setProjects(prev => prev.filter(p => p.id !== project.id));
                                  setSelectedProject(null);
                                } else alert(data.error || '删除失败');
                              })
                              .catch(() => alert('删除失败'));
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          title="删除项目"
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        
        {/* ===== Create/Edit Modal ===== */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => {
                setShowModal(false);
                setEditingProject(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {editingProject ? '编辑项目' : '创建项目'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditingProject(null);
                        setFormData({ title: '', location: '', industry: '', types: [], description: '', summary: '', coverImage: '', images: [], members: [], isDueDiligence: false, dueDiligenceDetails: '' });
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-4 space-y-4">
                    {/* Project Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        项目名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="请输入项目名称"
                        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Location & Industry */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          项目地点
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          placeholder="如：北京"
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          行业
                        </label>
                        <select
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="">请选择</option>
                          {industryOptions.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Project Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        项目类型（可多选）
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {typeOptions.map((opt: string) => (
                          <label
                            key={opt}
                            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                              formData.types.includes(opt)
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={opt}
                              checked={formData.types.includes(opt)}
                              onChange={() => {
                                setFormData({
                                  ...formData,
                                  types: formData.types.includes(opt)
                                    ? formData.types.filter((t: string) => t !== opt)
                                    : [...formData.types, opt]
                                });
                              }}
                              className="sr-only"
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Cover Image */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        封面图片
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageUpload}
                        className="hidden"
                      />
                      {coverImagePreview ? (
                        <div className="relative inline-block">
                          <img
                            src={coverImagePreview}
                            alt="封面预览"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeCoverImage}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
                        >
                          <Image className="w-5 h-5" />
                          <span>点击上传封面图片</span>
                        </button>
                      )}
                    </div>

                    {/* 简介 */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">项目简介</label>
                      <textarea value={formData.summary} onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 resize-none" placeholder="简短介绍项目亮点，将显示在项目卡片上..." />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        项目详情
                      </label>
                      <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                          <button
                            type="button"
                            onClick={() => formatText('bold')}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title="加粗"
                          >
                            <Bold className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => formatText('italic')}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title="斜体"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => formatText('list')}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title="列表"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => formatText('link')}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title="链接"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => editorImageRef.current?.click()}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title="上传图片"
                          >
                            <Image className="w-4 h-4" />
                          </button>
                          <input
                            ref={editorImageRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEditorImageUpload}
                            className="hidden"
                          />
                        </div>
                        <textarea
                          id="project-description"
                          rows={4}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="请输入项目详情..."
                          className="w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:outline-none"
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        支持格式：**加粗**、*斜体*、- 列表、[文字](链接)
                      </p>
                    </div>

                    {/* Due Diligence Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        是否尽调
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isDueDiligence"
                            checked={!formData.isDueDiligence}
                            onChange={() => setFormData({ ...formData, isDueDiligence: false, dueDiligenceDetails: '' })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">否</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="isDueDiligence"
                            checked={formData.isDueDiligence}
                            onChange={() => setFormData({ ...formData, isDueDiligence: true })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">是</span>
                        </label>
                      </div>
                    </div>

                    {/* Due Diligence Details */}
                    {formData.isDueDiligence && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          尽调详情
                        </label>
                        <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                            <button
                              type="button"
                              onClick={() => formatText('bold')}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                              title="加粗"
                            >
                              <Bold className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => formatText('italic')}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                              title="斜体"
                            >
                              <Italic className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => formatText('list')}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                              title="列表"
                            >
                              <List className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => formatText('link')}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                              title="链接"
                            >
                              <Link className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            id="due-diligence-details"
                            rows={4}
                            value={formData.dueDiligenceDetails}
                            onChange={(e) => setFormData({ ...formData, dueDiligenceDetails: e.target.value })}
                            placeholder="请输入尽调详情..."
                            className="w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Project Members */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        项目成员
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <UserSelect
                            onSelect={addMember}
                            onRemove={(userId) => {
                              const u = selectedMembers.find(m => m.id === userId);
                              if (u) removeMember(u.real_name || u.display_name || '用户');
                            }}
                            selectedUsers={selectedMembers}
                            placeholder="搜索成员（支持多选）..."
                          />
                        </div>
                      </div>
                      {formData.members.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {formData.members.map((member: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs"
                            >
                              <span className="text-slate-700 dark:text-slate-300">{member}</span>
                              <button
                                type="button"
                                onClick={() => removeMember(member)}
                                className="ml-1 text-slate-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditingProject(null);
                      }}
                      className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateProject}
                      disabled={!formData.title.trim()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {editingProject ? '更新' : t('common.create')}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* ===== End Create/Edit Modal ===== */}
        
        {/* Project Detail Modal */}
        <AnimatePresence>
          {selectedProject && (
            <>
              <WeChatShareSetup title={selectedProject?.title} description={(selectedProject?.summary || selectedProject?.description || '').replace(/<[^>]*>/g, '').slice(0, 200)} imageUrl={selectedProject?.coverImage || ''} />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[100]"
                onClick={() => setSelectedProject(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedProject?.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingProject(selectedProject);
                          setCoverImagePreview(selectedProject?.coverImage || null);
                          setFormData({
                            title: selectedProject.title,
                            location: selectedProject.location,
                            industry: selectedProject.industry,
                            types: selectedProject.types || [],
                            description: selectedProject.description,
                            summary: selectedProject.summary || '',
                            coverImage: selectedProject.coverImage || '',
                            images: selectedProject.images || [],
                            members: selectedProject.members || [],
                            isDueDiligence: selectedProject.isDueDiligence || false,
                            dueDiligenceDetails: selectedProject.dueDiligenceDetails || '',
                          });
                          setSelectedProject(null);
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {currentUserId && selectedProject?.creatorId === currentUserId && (
                        <button
                          onClick={() => {
                            if (!confirm('确定删除该项目？')) return;
                            fetch(`/api/projects?id=${selectedProject?.id}`, { method: 'DELETE' })
                              .then(r => r.json())
                              .then(data => {
                                if (data.success) {
                                  setProjects(prev => prev.filter(p => p.id !== selectedProject.id));
                                  setSelectedProject(null);
                                } else alert(data.error || '删除失败');
                              })
                              .catch(() => alert('删除失败'));
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          title="删除项目"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedProject(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Modal Body */}
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProject?.location && (
                        <div>
                          <p className="text-sm text-slate-500 mb-2">项目地点</p>
                          <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {selectedProject?.location}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-500 mb-2">项目类型</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProject?.types && selectedProject?.types.length > 0
                            ? selectedProject?.types?.map((t: string) => (
                                <span key={t} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">{t}</span>
                              ))
                            : <span className="text-slate-400 text-sm">未设置</span>
                          }
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-2">行业</p>
                        <p className="text-slate-700 dark:text-slate-300">{selectedProject?.industry || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-2">创建日期</p>
                        <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatSafeDate(selectedProject?.createdAt || (selectedProject as any)?.created_at || selectedProject?.date)}
                        </p>
                      </div>
                    </div>
                    
                    {selectedProject?.isDueDiligence && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">尽调详情</p>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedProject?.dueDiligenceDetails}</p>
                      </div>
                    )}
                    
                    
                    <div>
                      <p className="text-sm text-slate-500 mb-2">项目描述</p>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderDescription(selectedProject?.description) }} />
                    </div>
                    
                    {selectedProject?.images && selectedProject?.images.length > 0 && (
                      <div>
                        <p className="text-sm text-slate-500 mb-2">项目图片</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedProject?.images?.map((img: string, i: number) => (
                            <img key={i} src={img} alt={`图片${i + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 简介 */}
                  {selectedProject?.summary && (
                    <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                      <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">项目简介</h4>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{selectedProject?.summary}</p>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <Toast message={toastMessage} visible={showToast} />
      </div>
      )}
    </Layout>
  );
}
