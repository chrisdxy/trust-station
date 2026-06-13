"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RichTextEditor from '@/components/RichTextEditor';
import { Briefcase, Plus, MapPin, Calendar, X, Image, Upload, Users, UserPlus, Trash2, Edit, Pause, Play, CheckCircle, Search, Star, ChevronDown, Copy } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories, Category } from '@/hooks/useCategories';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { WeChatShareSetup } from '@/components/WeChatShareSetup';
import AIWriter from '@/components/AIWriter';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

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
  
  // State variables
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  
  // Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'created' | 'following'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchResult, setAiSearchResult] = useState('');
  const [followedProjects, setFollowedProjects] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('followedProjects');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // 关注/取消关注项目
  const toggleFollow = (projectId: string) => {
    setFollowedProjects(prev => {
      const updated = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      localStorage.setItem('followedProjects', JSON.stringify(updated));
      return updated;
    });
  };
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
    dueDiligenceDetails: ''
  });
  
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [riskResult, setRiskResult] = useState('');
  const [riskLoading, setRiskLoading] = useState(false);
  
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

  // 处理 ?view=xxx 自动打开项目详情
  useEffect(() => {
    if (!isAuthChecked) return;
    const viewId = new URLSearchParams(window.location.search).get('view');
    if (viewId) {
      fetch(`/api/projects?id=${viewId}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const p = d.project || d;
            setSelectedProject(p);
          } else {
            fetch(`/api/projects/${viewId}`)
              .then(r => r.json())
              .then(d2 => { if (d2.success) setSelectedProject(d2.project || d2); })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [isAuthChecked]);
  
  // Handle cover image upload
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 前端校验文件大小（超过 10MB 提前提示）
    if (file.size > 10 * 1024 * 1024) {
      toast('图片大小不能超过 10MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      setCoverImagePreview((e.target as FileReader).result as string);
    };
    reader.readAsDataURL(file);

    setUploadingCover(true);
    // Upload to server
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      // 检查 HTTP 状态码（非 JSON 响应时提前拦截）
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        toast('上传失败: ' + (res.status === 413 ? '图片过大' : '服务器错误 ' + res.status));
        console.error('Upload HTTP error:', res.status, text.substring(0, 200));
        return;
      }
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
    } finally {
      setUploadingCover(false);
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
    if (!/<[a-z][\s\S]*>/i.test(text)) {
      return text.replace(/\n/g, '<br/>');
    }
    return text;
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

  // Add/remove members via UserSelect multi-select
  const addMember = (user: UserSearchResult) => {
    const name = user.real_name || user.display_name || '用户';
    setSelectedMembers(prev => [...prev, user]);
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(name) ? prev.members : [...prev.members, name]
    }));
  };

  const removeMember = (member: string) => {
    setSelectedMembers(prev => prev.filter(u => (u.real_name || u.display_name) !== member));
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m !== member)
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
            summary: formData.summary || '',
            coverImage: formData.coverImage,
            images: formData.images,
            projectTypes: formData.types,
            industry: formData.industry,
            location: formData.location
          })
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
            summary: formData.summary || '',
            coverImage: formData.coverImage,
            projectTypes: formData.types,
            industry: formData.industry,
            location: formData.location
          })
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
    if (activeTab === 'following' && !followedProjects.includes(project.id)) return false;
    
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
              { key: 'following', label: '我关注的' }
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

          {/* AI 智能匹配 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 relative">
                <textarea
                  value={aiSearchQuery}
                  onChange={e => setAiSearchQuery(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && !e.shiftKey && aiSearchQuery.trim()) {
                      e.preventDefault();
                      setAiSearching(true);
                      setAiSearchResult('');
                      try {
                        const projectsList = projects.map(p => ({
                          title: p.title, id: p.id, industry: p.industry, types: p.types,
                          location: p.location, summary: p.summary, status: p.status
                        }));
                        const res = await fetch('/api/ai', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'match',
                            prompt: `【严格限定】用户需求：${aiSearchQuery}
【规则】只能从下方提供的项目列表中推荐，绝对禁止推荐列表中不存在的项目。如果没有匹配的项目，请如实回答"未找到匹配项目"。
返回格式：每行"项目名称（ID:项目ID）| 匹配度% | 匹配理由"`,
                            context: `项目列表（仅限以下项目，共${projectsList.length}个）：\n${projectsList.map(p => `ID:${p.id} | ${p.title} | 类型:${(p.types||[]).join(',')} | 地点:${p.location||''} | 行业:${p.industry||''}`).join('\n')}`,
                            content: '请严格依据以上列表进行匹配推荐，不得新增任何列表外的项目'
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          const lines = data.result.split('\n').filter(Boolean);
                          setAiSearchResult(lines.join('\n'));
                        } else {
                          setAiSearchResult('AI 匹配失败，请稍后重试');
                        }
                      } catch { setAiSearchResult('网络错误，请稍后重试'); }
                      finally { setAiSearching(false); }
                    }
                  }}
                  placeholder="输入需求，AI 智能匹配项目（Shift+Enter换行）..."
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-indigo-600 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none overflow-hidden min-h-[42px]"
                  rows={1}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                  }}
                />
                {aiSearching && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-indigo-500" />}
              </div>
              <button onClick={async () => {
                if (!aiSearchQuery.trim()) return;
                setAiSearching(true);
                setAiSearchResult('');
                try {
                  const projectsList = projects.map(p => ({
                    title: p.title, id: p.id, industry: p.industry, types: p.types,
                    location: p.location, summary: p.summary, status: p.status
                  }));
                  const res = await fetch('/api/ai', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'match',
                      prompt: `【严格限定】用户需求：${aiSearchQuery}
【规则】只能从下方提供的项目列表中推荐，绝对禁止推荐列表中不存在的项目。如果没有匹配的项目，请如实回答"未找到匹配项目"。
返回格式：每行"项目名称（ID:项目ID）| 匹配度% | 匹配理由"`,
                      context: `项目列表（仅限以下项目，共${projectsList.length}个）：\n${projectsList.map(p => `ID:${p.id} | ${p.title} | 类型:${(p.types||[]).join(',')} | 地点:${p.location||''} | 行业:${p.industry||''}`).join('\n')}`,
                      content: '请严格依据以上列表进行匹配推荐，不得新增任何列表外的项目'
                    })
                  });
                  const data = await res.json();
                  if (data.success) {
                    const lines = data.result.split('\n').filter(Boolean);
                    setAiSearchResult(lines.join('\n'));
                  } else setAiSearchResult('AI 匹配失败');
                } catch { setAiSearchResult('网络错误'); }
                finally { setAiSearching(false); }
              }} disabled={aiSearching}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                {aiSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI 匹配
              </button>
            </div>
            {aiSearchResult && (
              <div className="mt-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">匹配结果</div>
                <div className="space-y-2">
                  {aiSearchResult.split('\n').filter(Boolean).map((line, i) => {
                    const idMatch = line.match(/ID:([a-f0-9-]+)/i);
                    const parts = line.split('|').map(s => s.trim());
                    const title = (parts[0] || '').replace(/\s*（?ID:[a-f0-9-]+）?\s*/i, '').trim();
                    const score = parts[1] || '';
                    const reason = parts[2] || '';
                    const projectId = idMatch ? idMatch[1] : '';
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors">
                        <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 text-xs font-medium flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {projectId ? (
                              <button onClick={() => {
                                const p = projects.find(pr => pr.id === projectId);
                                if (p) setSelectedProject(p);
                              }}
                                className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline truncate text-left">
                                {title || line}
                              </button>
                            ) : (
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{title || line}</span>
                            )}
                            {score && <span className="text-xs text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium">{score}</span>}
                          </div>
                          {reason && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                      onChange={e => {
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
                onClick={e => e.stopPropagation()}
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
                    {/* 标题 */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-base line-clamp-1 flex-1">
                        {project.title}
                      </h3>
                      <button onClick={e => { e.stopPropagation(); toggleFollow(project.id); }}
                        className={`ml-2 p-1.5 rounded-lg transition-all flex-shrink-0 ${
                          followedProjects.includes(project.id)
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                            : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                        title={followedProjects.includes(project.id) ? '取消关注' : '关注项目'}
                      >
                        <Star className={`w-4 h-4 ${followedProjects.includes(project.id) ? 'fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* 创建人 + 创建时间 */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {project.creatorName || '未知用户'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {safeDate(project.createdAt || project.date)}
                      </span>
                    </div>

                    {/* 地点 */}
                    {project.location && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                        <MapPin size={12} />
                        {project.location}
                      </div>
                    )}

                    {/* 简介 */}
                    <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">
                      {(project.summary || '').replace(/<[^>]*>/g, '')}
                    </div>

                    {/* 项目ID + 类型标签 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono cursor-pointer hover:bg-amber-200 transition-colors"
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(getShortProjectId(project.id)).then(() => {}); }}
                        title="点击复制项目ID，用于记录中心查询">
                        ID: {getShortProjectId(project.id)}
                      </span>
                      {project.types && project.types.map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                          {t}
                        </span>
                      ))}
                      {project.isDueDiligence && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">尽调</span>
                      )}
                    </div>

                    {/* 删除按钮 — 仅创建者可见 */}
                    {currentUserId && project.creatorId === currentUserId && (
                      <div className="flex justify-end mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <button
                          onClick={e => {
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
                onClick={e => e.stopPropagation()}
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
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
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
                          onChange={e => setFormData({ ...formData, location: e.target.value })}
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
                          onChange={e => setFormData({ ...formData, industry: e.target.value })}
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
                      <textarea value={formData.summary} onChange={e => setFormData(prev => ({ ...prev, summary: e.target.value }))} rows={3} className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 resize-none" placeholder="简短介绍项目亮点，将显示在项目卡片上..." />
                    </div>

                    {/* Description */}
                    <div>
                      </div>
                      {/* 项目详情 */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            项目详情
                          </label>
                          <button type="button" onClick={async () => {
                            if (!formData.description.trim()) { alert('请先填写项目描述'); return; }
                            setRiskLoading(true);
                            setRiskResult('');
                            try {
                              const res = await fetch('/api/ai', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'analyze',
                                  content: formData.description,
                                  prompt: '请分析以上项目描述，检测是否存在以下风险：1）虚假或夸大承诺 2）模糊不清的描述 3）潜在的合规问题。逐项列出风险并给出改进建议。返回格式：风险项 | 风险等级(高/中/低) | 改进建议',
                                  context: '这是用户发布的合作项目描述，需要做风险审核',
                                }),
                              });
                              const data = await res.json();
                              if (data.success) setRiskResult(data.result);
                            } catch {} finally { setRiskLoading(false); }
                          }} disabled={riskLoading}
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                            {riskLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                            风险检测
                          </button>
                        </div>
                        <RichTextEditor
                          placeholder="请输入项目详情，支持富文本格式，可插入图片..."
                          value={formData.description}
                          onChange={v => setFormData(prev => ({ ...prev, description: v }))}
                        />
                    {riskResult && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        <div className="font-medium text-red-600 mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />风险检测结果</div>
                        {riskResult}
                      </div>
                    )}
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
                        <RichTextEditor
                          placeholder="尽调详情..."
                          value={formData.dueDiligenceDetails}
                          onChange={v => setFormData(prev => ({ ...prev, dueDiligenceDetails: v }))}
                        />
                            rows={4}
                            value={formData.dueDiligenceDetails}
                            onChange={e => setFormData({ ...formData, dueDiligenceDetails: e.target.value })}
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
                            onRemove={userId => {
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
              <WeChatShareSetup title={selectedProject?.title} description={(selectedProject?.summary || selectedProject?.description || '').replace(/<[^>]*>/g, '').slice(0, 200)} imageUrl={selectedProject?.coverImage || ''} link={window.location.origin + '/projects?view=' + selectedProject?.id} />
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
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {selectedProject?.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      {currentUserId && selectedProject?.creatorId === currentUserId && (
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
                            dueDiligenceDetails: selectedProject.dueDiligenceDetails || ''
                          });
                          setSelectedProject(null);
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      )}
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
