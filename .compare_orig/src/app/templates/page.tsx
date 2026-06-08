"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layout, Plus, Eye, Edit2, Trash2, Copy, Check, X, Grid, List, Search, 
  User, Building, Award, ExternalLink, Share2, FileText, Globe, EyeOff, RefreshCcw
} from 'lucide-react';
import LayoutComponent from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

interface DisplayField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'textarea' | 'link' | 'email' | 'phone' | 'phones';
  placeholder?: string;
}

// 手机号字段类型定义
interface PhoneField {
  key: string;
  label: string;
  value: string;
  type: 'phone';
  placeholder?: string;
}

interface DisplayProfile {
  id: string;
  type: 'personal' | 'enterprise' | 'expert';
  avatar?: string;
  fields: DisplayField[];
  phoneNumbers: string[];  // 支持多个手机号
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  shareCode: string;
}

const categoryConfig = {
  personal: {
    label: '个人名片',
    icon: User,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30',
    bgColor: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  enterprise: {
    label: '企业名片',
    icon: Building,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    bgColor: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  expert: {
    label: '专家名片',
    icon: Award,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30',
    bgColor: 'from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
};

// 默认字段模板（不包含姓名，姓名自动从系统获取；phoneNumbers 单独处理多手机号）
const defaultFieldTemplates = {
  personal: [
    { key: 'title', label: '职位/头衔', type: 'text' as const, placeholder: '如：创业者、项目经理' },
    { key: 'company', label: '公司/组织', type: 'text' as const, placeholder: '公司名称（选填）' },
    { key: 'bio', label: '个人简介', type: 'textarea' as const, placeholder: '简要介绍自己...' },
    { key: 'email', label: '邮箱', type: 'email' as const, placeholder: '请输入邮箱地址' },
    // phoneNumbers 字段单独处理，不放在这里
    { key: 'wechat', label: '微信', type: 'text' as const, placeholder: '微信号（选填）' },
    { key: 'expertise', label: '专业领域', type: 'text' as const, placeholder: '如：项目管理、前端开发' },
    { key: 'cooperation', label: '合作意向', type: 'textarea' as const, placeholder: '希望寻找什么样的合作机会...' },
  ],
  enterprise: [
    { key: 'companyName', label: '企业名称', type: 'text' as const, placeholder: '请输入企业名称' },
    { key: 'industry', label: '所属行业', type: 'text' as const, placeholder: '如：科技、金融、制造' },
    { key: 'scale', label: '企业规模', type: 'text' as const, placeholder: '如：50-100人' },
    { key: 'description', label: '企业简介', type: 'textarea' as const, placeholder: '介绍企业主营业务、优势...' },
    { key: 'website', label: '官网', type: 'link' as const, placeholder: 'https://...' },
    { key: 'email', label: '联系邮箱', type: 'email' as const, placeholder: '请输入联系邮箱' },
    { key: 'address', label: '地址', type: 'text' as const, placeholder: '公司地址' },
    { key: 'cooperation', label: '合作需求', type: 'textarea' as const, placeholder: '希望寻找什么样的合作伙伴...' },
  ],
  expert: [
    { key: 'title', label: '职称/头衔', type: 'text' as const, placeholder: '如：高级工程师、教授' },
    { key: 'field', label: '专业领域', type: 'text' as const, placeholder: '如：人工智能、法律咨询' },
    { key: 'experience', label: '从业经验', type: 'text' as const, placeholder: '如：15年经验' },
    { key: 'education', label: '教育背景', type: 'text' as const, placeholder: '如：清华大学 MBA' },
    { key: 'bio', label: '专家简介', type: 'textarea' as const, placeholder: '详细介绍专业背景、擅长领域...' },
    { key: 'email', label: '邮箱', type: 'email' as const, placeholder: '请输入邮箱地址' },
    // phoneNumbers 字段单独处理，不放在这里
    { key: 'consultation', label: '咨询说明', type: 'textarea' as const, placeholder: '咨询服务范围、收费说明...' },
  ],
};

function generateShareCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function TemplatesPage() {
  const { t } = useLanguage();
  const { profile, user } = useAuth();
  const { publicProfiles, setPublicProfiles } = useData();
  
  
  // 加载名片数据
  React.useEffect(() => {
    if (!user?.id) return;
    const fetchProfiles = async () => {
      try {
        const res = await fetch(`/api/profiles?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setPublicProfiles(data.profiles || []);
        }
      } catch (err) {
        console.error("获取名片列表失败:", err);
      }
    };
    fetchProfiles();
  }, [user?.id]);
  
  // 从用户资料获取姓名
  // 从用户资料获取姓名（优先显示真实姓名）
  const userName = profile?.real_name || profile?.display_name || '未设置姓名';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProfile, setSelectedProfile] = useState<DisplayProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DisplayProfile | null>(null);
  const [profileForm, setProfileForm] = useState<{
    type: DisplayProfile['type'];
    fields: DisplayField[];
    phoneNumbers: string[];
  }>({ type: 'personal', fields: [], phoneNumbers: [] });

  const categories = [
    { key: 'all', label: '全部' },
    { key: 'personal', label: '个人' },
    { key: 'enterprise', label: '企业' },
    { key: 'expert', label: '专家' },
  ];

  const filteredProfiles = publicProfiles.filter(profile => {
    const nameMatch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      profile.fields.some(f => f.value.toLowerCase().includes(searchTerm.toLowerCase()));
    const categoryMatch = selectedCategory === 'all' || profile.type === selectedCategory;
    return nameMatch && categoryMatch;
  });

  // 获取所有名片（包括公开和未公开）
  const allProfiles = publicProfiles;

  const handleNewProfile = (type: DisplayProfile['type']) => {
    const template = defaultFieldTemplates[type];
    
    // 从用户资料提取 email 和 phone 自动填充
    const autoFilledFields = template.map(t => {
      let autoValue = '';
      if (t.key === 'email' && profile?.email) {
        autoValue = profile.email;
      }
      return { ...t, value: autoValue };
    });
    
    // 初始化 phoneNumbers，如果有 profile.phone 则添加
    const initialPhones: string[] = [];
    if (profile?.phone) {
      initialPhones.push(profile.phone);
    }
    
    setProfileForm({
      type,
      fields: autoFilledFields,
      phoneNumbers: initialPhones,
    });
    setEditingProfile(null);
    setShowEditModal(true);
  };

  const handleEditProfile = (profile: DisplayProfile) => {
    setProfileForm({
      type: profile.type,
      fields: [...profile.fields],
      phoneNumbers: profile.phoneNumbers || [],
    });
    setEditingProfile(profile);
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    if (editingProfile) {
      // 更新现有名片
      setPublicProfiles(prev =>
        prev.map(p => p.id === editingProfile.id ? {
          ...p,
          fields: profileForm.fields,
          phoneNumbers: profileForm.phoneNumbers,
          updatedAt: new Date().toISOString().split('T')[0],
        } : p)
      );
    } else {
      // 创建新名片
      const newProfile: DisplayProfile = {
        id: `${Date.now()}`,
        type: profileForm.type,
        fields: profileForm.fields,
        phoneNumbers: profileForm.phoneNumbers,
        isDefault: publicProfiles.length === 0,
        isPublic: true, // 默认公开
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        shareCode: generateShareCode(),
      };
      setPublicProfiles(prev => [newProfile, ...prev]);
    }
    
    setShowEditModal(false);
    setEditingProfile(null);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('确定要删除这张名片吗？')) return;
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setPublicProfiles(prev => prev.filter(p => p.id !== id));
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除名片失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleTogglePublic = async (id: string) => {
    const profile = publicProfiles.find(p => p.id === id);
    if (!profile) return;
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !profile.isPublic }),
      });
      const data = await response.json();
      if (data.success) {
        setPublicProfiles(prev =>
          prev.map(p => p.id === id ? {
            ...p,
            isPublic: !p.isPublic,
            updatedAt: new Date().toISOString().split('T')[0],
          } : p)
        );
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新名片失败:', error);
      alert('更新失败，请重试');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await response.json();
      if (data.success) {
        setPublicProfiles(prev =>
          prev.map(p => ({
            ...p,
            isDefault: p.id === id,
          }))
        );
      } else {
        alert(data.error || '设置失败');
      }
    } catch (error) {
      console.error('设置默认名片失败:', error);
      alert('设置失败，请重试');
    }
  };

  const handleCopyShareLink = (code: string) => {
    const link = `${window.location.origin}/share/${code}`;
    navigator.clipboard.writeText(link);
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'email': return '✉️';
      case 'phone': return '📞';
      case 'link': return '🔗';
      default: return '•';
    }
  };

  return (
    <LayoutComponent>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Layout className="w-8 h-8 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              对外展示
            </h1>
          </div>
          <p className="text-slate-500">
            <span className="hidden sm:inline">创建和管理您的对外展示名片</span>
            <span className="sm:hidden">管理您的对外展示名片</span>
            {profileForm.type !== 'enterprise' && (
              <>，名片将自动使用您的姓名：<span className="font-medium text-amber-600">{userName}</span></>
            )}
          </p>
        </motion.div>

        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索名片..."
              className="w-full pl-12 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* 新建按钮组 */}
            <div className="flex gap-2">
              <button
                onClick={() => handleNewProfile('personal')}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <User className="w-4 h-4" />
                个人
              </button>
              <button
                onClick={() => handleNewProfile('enterprise')}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Building className="w-4 h-4" />
                企业
              </button>
              <button
                onClick={() => handleNewProfile('expert')}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Award className="w-4 h-4" />
                专家
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.key
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Profiles Grid/List */}
        <AnimatePresence mode="wait">
          {allProfiles.length > 0 ? (
            viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {allProfiles.map((profile, idx) => {
                  const config = categoryConfig[profile.type];
                  const Icon = config.icon;
                  // 获取显示名称
                  const displayName = profile.type === 'enterprise' 
                    ? profile.fields.find(f => f.key === 'companyName')?.value || '未命名企业'
                    : userName;
                  return (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 ${config.borderColor} hover:shadow-md transition-all overflow-hidden ${!profile.isPublic ? 'opacity-60' : ''}`}
                    >
                      {/* 卡片头部 */}
                      <div className={`bg-gradient-to-r ${config.bgColor} p-4`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">
                              <Icon className={`w-6 h-6 ${config.color.replace('bg-', 'text-')}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 dark:text-white">{displayName}</h3>
                              <div className="flex items-center gap-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
                                  {config.label}
                                </span>
                                {profile.isPublic ? (
                                  <span className="text-xs text-green-600 flex items-center gap-0.5">
                                    <Globe className="w-3 h-3" /> 公开
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                    <EyeOff className="w-3 h-3" /> 私密
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {profile.isDefault && (
                            <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full">默认</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 卡片内容 */}
                      <div className="p-4">
                        <div className="space-y-2 mb-4">
                          {profile.fields.slice(0, 3).map((field) => (
                            <div key={field.key} className="flex items-center gap-2 text-sm">
                              <span className="text-slate-400">{getFieldIcon(field.type)}</span>
                              <span className="text-slate-600 dark:text-slate-300 truncate">
                                {field.label}: {field.value || '未填写'}
                              </span>
                            </div>
                          ))}
                          {profile.fields.length > 3 && (
                            <p className="text-xs text-slate-400">+{profile.fields.length - 3} 更多字段</p>
                          )}
                          {/* 手机号显示 */}
                          {profile.phoneNumbers && profile.phoneNumbers.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-400">📞</span>
                              <span className="text-slate-600 dark:text-slate-300 truncate">
                                手机号: {profile.phoneNumbers[0]}{profile.phoneNumbers.length > 1 ? ` +${profile.phoneNumbers.length - 1}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* 分享码 */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                          <span>分享码: {profile.shareCode}</span>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => { setSelectedProfile(profile); }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            预览
                          </button>
                          <button
                            onClick={() => handleTogglePublic(profile.id)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm transition-colors ${
                              profile.isPublic 
                                ? 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-600'
                                : 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600'
                            }`}
                          >
                            {profile.isPublic ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                取消公开
                              </>
                            ) : (
                              <>
                                <Globe className="w-4 h-4" />
                                公开
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyShareLink(profile.shareCode)}
                            className="flex items-center justify-center gap-1 p-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-lg text-amber-600 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditProfile(profile)}
                            className="flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {allProfiles.map((profile, idx) => {
                  const config = categoryConfig[profile.type];
                  const Icon = config.icon;
                  const displayName = profile.type === 'enterprise' 
                    ? profile.fields.find(f => f.key === 'companyName')?.value || '未命名企业'
                    : userName;
                  return (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 ${config.borderColor} p-4 flex items-center gap-4 ${!profile.isPublic ? 'opacity-60' : ''}`}
                    >
                      <div className={`w-14 h-14 bg-gradient-to-br ${config.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-7 h-7 ${config.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{displayName}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs ${config.color}`}>
                            {config.label}
                          </span>
                          {profile.isPublic ? (
                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                              <Globe className="w-3 h-3" /> 公开
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                              <EyeOff className="w-3 h-3" /> 私密
                            </span>
                          )}
                          {profile.isDefault && (
                            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">默认</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {profile.fields.find(f => f.type === 'text' && f.value)?.value || '未填写简介'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-400">{profile.shareCode}</span>
                        <button
                          onClick={() => { setSelectedProfile(profile); }}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleTogglePublic(profile.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            profile.isPublic 
                              ? 'hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-500'
                              : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500'
                          }`}
                        >
                          {profile.isPublic ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleCopyShareLink(profile.shareCode)}
                          className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                        >
                          <Share2 className="w-4 h-4 text-amber-500" />
                        </button>
                        <button
                          onClick={() => handleEditProfile(profile)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">暂无展示名片</h3>
              <p className="text-slate-500 mb-6">点击上方按钮创建您的第一个展示名片</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleNewProfile('personal')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                >
                  <User className="w-5 h-5" />
                  个人名片
                </button>
                <button
                  onClick={() => handleNewProfile('enterprise')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Building className="w-5 h-5" />
                  企业名片
                </button>
                <button
                  onClick={() => handleNewProfile('expert')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Award className="w-5 h-5" />
                  专家名片
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Modal */}
        <AnimatePresence>
          {selectedProfile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setSelectedProfile(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 预览头部 */}
                <div className={`bg-gradient-to-r ${categoryConfig[selectedProfile.type].bgColor} p-6`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                      {React.createElement(categoryConfig[selectedProfile.type].icon, {
                        className: `w-8 h-8 ${categoryConfig[selectedProfile.type].color.replace('bg-', 'text-')}`
                      })}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedProfile.type === 'enterprise' 
                          ? selectedProfile.fields.find(f => f.key === 'companyName')?.value || '未命名企业'
                          : userName}
                      </h2>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${categoryConfig[selectedProfile.type].color}`}>
                        {categoryConfig[selectedProfile.type].label}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 预览内容 */}
                <div className="p-6">
                  <div className="space-y-4">
                    {selectedProfile.fields.filter(f => f.value).map((field) => (
                      <div key={field.key} className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                          {getFieldIcon(field.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-400">{field.label}</p>
                          <p className="text-slate-700 dark:text-slate-200">
                            {field.type === 'email' ? (
                              <a href={`mailto:${field.value}`} className="text-blue-500 hover:underline">{field.value}</a>
                            ) : field.type === 'link' ? (
                              <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{field.value}</a>
                            ) : (
                              field.value
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* 多手机号预览 */}
                    {selectedProfile.phoneNumbers && selectedProfile.phoneNumbers.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                          📞
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-400">手机号码</p>
                          <div className="space-y-1">
                            {selectedProfile.phoneNumbers.map((phone, idx) => (
                              <p key={idx} className="text-slate-700 dark:text-slate-200">
                                <a href={`tel:${phone}`} className="text-blue-500 hover:underline">{phone}</a>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 分享码 */}
                  <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500">分享码</p>
                        <p className="font-mono font-bold text-amber-600">{selectedProfile.shareCode}</p>
                      </div>
                      <button
                        onClick={() => handleCopyShareLink(selectedProfile.shareCode)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        复制链接
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setSelectedProfile(null)}
                    className="w-full py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    关闭预览
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {editingProfile ? '编辑名片' : `新建${categoryConfig[profileForm.type].label}`}
                    </h2>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                  {/* 企业名称（仅企业名片） */}
                  {profileForm.type === 'enterprise' ? (
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        企业名称
                      </label>
                      <input
                        type="text"
                        value={profileForm.fields.find(f => f.key === 'companyName')?.value || ''}
                        onChange={(e) => setProfileForm(prev => ({
                          ...prev,
                          fields: prev.fields.map(f => f.key === 'companyName' ? { ...f, value: e.target.value } : f),
                        }))}
                        placeholder="请输入企业名称"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                    </div>
                  ) : (
                    /* 姓名显示（个人/专家名片只读） */
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-slate-400" />
                        <span className="text-sm text-slate-500">名片姓名（系统自动获取）</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white mt-1">{userName}</p>
                    </div>
                  )}
                  
                  {/* 名片类型 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      名片类型
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['personal', 'enterprise', 'expert'] as const).map((cat) => {
                        const config = categoryConfig[cat];
                        const Icon = config.icon;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              if (!editingProfile) {
                                setProfileForm(prev => ({
                                  ...prev,
                                  type: cat,
                                  fields: defaultFieldTemplates[cat].map(t => ({ ...t, value: '' })),
                                }));
                              }
                            }}
                            disabled={!!editingProfile}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                              profileForm.type === cat
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                            } ${editingProfile ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Icon className={`w-5 h-5 ${profileForm.type === cat ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className={`text-xs font-medium ${profileForm.type === cat ? 'text-amber-600' : 'text-slate-500'}`}>
                              {config.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* 字段编辑 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      展示信息
                    </label>
                    <div className="space-y-3">
                      {profileForm.fields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs text-slate-500 mb-1">
                            {field.label}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={field.value}
                              onChange={(e) => setProfileForm(prev => ({
                                ...prev,
                                fields: prev.fields.map(f => f.key === field.key ? { ...f, value: e.target.value } : f),
                              }))}
                              placeholder={field.placeholder}
                              rows={3}
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none text-sm"
                            />
                          ) : (
                            <input
                              type={field.type === 'text' ? 'text' : field.type}
                              value={field.value}
                              onChange={(e) => setProfileForm(prev => ({
                                ...prev,
                                fields: prev.fields.map(f => f.key === field.key ? { ...f, value: e.target.value } : f),
                              }))}
                              placeholder={field.placeholder}
                              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 多手机号编辑 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      手机号码（可添加多个）
                    </label>
                    <div className="space-y-2">
                      {profileForm.phoneNumbers.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setProfileForm(prev => ({
                              ...prev,
                              phoneNumbers: prev.phoneNumbers.map((p, i) => i === idx ? e.target.value : p),
                            }))}
                            placeholder="请输入手机号码"
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                          />
                          <button
                            onClick={() => setProfileForm(prev => ({
                              ...prev,
                              phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== idx),
                            }))}
                            className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setProfileForm(prev => ({
                          ...prev,
                          phoneNumbers: [...prev.phoneNumbers, ''],
                        }))}
                        className="flex items-center gap-2 w-full py-2.5 px-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        添加手机号码
                      </button>
                    </div>
                    {profileForm.phoneNumbers.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        {profile?.phone ? '已从资料中提取您的手机号，可点击上方按钮添加更多' : '暂无手机号，点击上方按钮添加'}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 rounded-xl text-white transition-colors font-medium"
                  >
                    {editingProfile ? '保存修改' : '创建名片'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutComponent>
  );
}
