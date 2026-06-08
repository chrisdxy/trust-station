"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, MapPin, Calendar, X, Bold, Italic, List, Link, Image, Upload, Users, UserPlus, Trash2, Edit, Pause, Play, CheckCircle, Search, Star, ChevronDown, Copy } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories, Category } from '@/hooks/useCategories';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { ShareButton } from '@/components/ShareButton';

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
  type: string;
  description: string;
  images: string[];
  date: string;
  members: string[];
  creatorId?: string;
  paused?: boolean;
  isDueDiligence?: boolean;
  dueDiligenceDetails?: string;
  coverImage?: string;
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
  const [selectedMember, setSelectedMember] = useState<UserSearchResult | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    industry: '',
    type: '合作' as string,
    description: '',
    coverImage: '',
    images: [] as string[],
    members: [] as string[],
    isDueDiligence: false,
    dueDiligenceDetails: '',
  });
  
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
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
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setCurrentUserId(data.user.id);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    };
    loadUser();
    loadProjects();
  }, []);
  
  // Handle cover image upload
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string);
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
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
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
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
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
  
  // Add member
  const addMember = () => {
    const memberName = selectedMember?.real_name || selectedMember?.display_name || '用户';
    if (selectedMember && !formData.members.includes(memberName)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, memberName],
      }));
      setSelectedMember(null);
    }
  };
  
  // Remove member
  const removeMember = (member: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m !== member),
    }));
  };
  
  // Handle create/update project
  const handleCreateProject = async () => {
    if (!formData.title.trim()) return;
    
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
            projectType: formData.type,
            industry: formData.industry,
            location: formData.location,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setProjects(projects.map(p => 
            p.id === editingProject.id 
              ? { ...p, ...formData }
              : p
          ));
          setSelectedProject(projects.find(p => p.id === editingProject.id) ? { ...projects.find(p => p.id === editingProject.id)!, ...formData } : null);
          setEditingProject(null);
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
            projectType: formData.type,
            industry: formData.industry,
            location: formData.location,
          }),
        });
        const data = await res.json();
        if (data.success) {
          await loadProjects();
          setCreatedProjectId(data.id);
        } else {
          toast(data.error || '创建失败');
        }
      } catch (err) {
        console.error('创建项目失败:', err);
        toast('创建失败');
      }
    }
    
    setFormData({ title: '', location: '', industry: '', type: '合作', description: '', coverImage: '', images: [], members: [], isDueDiligence: false, dueDiligenceDetails: '' });
    setShowModal(false);
  };
  
  // Categories
  const categories = useCategories();
  const industryOptions: string[] = categories['project_industry']?.map((c: Category) => c.name) || [];
  const typeOptions: string[] = ['合作', '投资', '公益'];
  
  return (
    <Layout>
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
              {t('common.create')}
            </button>
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
                  <code className="text-sm text-amber-600 dark:text-amber-400">{createdProjectId}</code>
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
          {projects.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无项目，点击上方按钮创建</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, idx) => (
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
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {project.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(project.date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        
        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={() => setShowModal(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={() => setShowModal(false)}
              >
                <div
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {editingProject ? '编辑项目' : t('common.create')}
                    </h2>
                    <button
                      onClick={() => {
                        setShowModal(false);
                        setEditingProject(null);
                        setFormData({ title: '', location: '', industry: '', type: '合作', description: '', coverImage: '', images: [], members: [], isDueDiligence: false, dueDiligenceDetails: '' });
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
                          {industryOptions.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Project Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        项目类型
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {typeOptions.map((opt) => (
                          <label
                            key={opt}
                            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
                              formData.type === opt
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="projectType"
                              value={opt}
                              checked={formData.type === opt}
                              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                        ></textarea>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        支持格式：**加粗**、*斜体*、- 列表、[文字](链接)
                      </p>
                    </div>
                    
                    {/* Due Diligence */}
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
                          ></textarea>
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
                            onSelect={(user) => setSelectedMember(user)}
                            selectedUsers={selectedMember ? [selectedMember] : []}
                            placeholder="搜索成员..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addMember}
                          disabled={!selectedMember}
                          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                          <UserPlus className="w-4 h-4" />
                          添加
                        </button>
                      </div>
                      {formData.members.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {formData.members.map((member, i) => (
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
                      onClick={() => setShowModal(false)}
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
            </>
          )}
        </AnimatePresence>
        
        {/* Project Detail Modal */}
        <AnimatePresence>
          {selectedProject && (
            <>
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
                      {selectedProject.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <ShareButton targetType="project" targetId={selectedProject.id} title={selectedProject.title} />
                      <button
                        onClick={() => {
                          setEditingProject(selectedProject);
                          setFormData({
                            title: selectedProject.title,
                            location: selectedProject.location,
                            industry: selectedProject.industry,
                            type: selectedProject.type,
                            description: selectedProject.description,
                            coverImage: selectedProject.coverImage || '',
                            images: selectedProject.images || [],
                            members: selectedProject.members || [],
                            isDueDiligence: selectedProject.isDueDiligence || false,
                            dueDiligenceDetails: selectedProject.dueDiligenceDetails || '',
                          });
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
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
                    {selectedProject.coverImage && (
                      <div className="h-64 rounded-lg overflow-hidden">
                        <img 
                          src={selectedProject.coverImage} 
                          alt={selectedProject.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-slate-500 mb-2">项目描述</p>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedProject.description}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {selectedProject.location && (
                        <div>
                          <p className="text-sm text-slate-500 mb-2">项目地点</p>
                          <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {selectedProject.location}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-slate-500 mb-2">项目类型</p>
                        <p className="text-slate-700 dark:text-slate-300">{selectedProject.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-2">行业</p>
                        <p className="text-slate-700 dark:text-slate-300">{selectedProject.industry}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-2">创建日期</p>
                        <p className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(selectedProject.date).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    
                    {selectedProject.isDueDiligence && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">尽调详情</p>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedProject.dueDiligenceDetails}</p>
                      </div>
                    )}
                    
                    {selectedProject.images && selectedProject.images.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">项目图片</p>
                        <div className="grid grid-cols-3 gap-2">
                          {selectedProject.images.map((img, i) => (
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
    </Layout>
  );
}
