"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Users2, Plus, Search, Globe, X, Bold, Italic, List, Link, Image, ImageIcon, Eye, Upload, Calendar, MapPin, Clock, User, Star, Edit, Trash2, ChevronDown, UserPlus, LogOut, CheckCircle, Copy } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories, Category } from '@/hooks/useCategories';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { IndustrySelect } from '@/components/IndustrySelect';
import { ShareButton } from '@/components/ShareButton';

import { motion, AnimatePresence } from 'framer-motion';

interface Member {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: string;
}

interface CommunityActivity {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: number;
}

interface Community {
  id: string;
  name: string;
  members: number;
  memberList: Member[];
  category: string;
  industry?: string;  // 行业ID
  industryName?: string;  // 行业名称
  description: string;
  images: string[];
  activities: CommunityActivity[];
  createdAt: string;
  isPublic: boolean;
  isPaid: boolean;  // 是否收费
  qrCode?: string;  // 社群二维码
  ownerId?: string;  // 创建者ID
  ownerName?: string;  // 创建者名称
}

export default function CommunitiesPage() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 从 localStorage 获取当前用户
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        // 如果用户已加入某些社区，从 API 获取
      }
    } catch (e) {}
  }, []);

  // 加载共同体列表
  const fetchCommunities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/communities');
      const data = await res.json();
      if (data.success) {
        setCommunities(data.communities || []);
      }
    } catch (err) {
      console.error('加载共同体列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);
  const [activeTab, setActiveTab] = useState<'all' | 'created' | 'joined' | 'free' | 'paid'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [createdCommunityId, setCreatedCommunityId] = useState<string | null>(null);
  const [showFeeFilter, setShowFeeFilter] = useState(false);
  const feeFilterRef = useRef<HTMLDivElement>(null);
  const [feeFilterPos, setFeeFilterPos] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    if (showFeeFilter && feeFilterRef.current) {
      const rect = feeFilterRef.current.getBoundingClientRect();
      setFeeFilterPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showFeeFilter]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'entrepreneurship',
    industry: '',  // 行业ID
    industryName: '',  // 行业名称
    description: '',
    coverImage: '',
    images: [] as string[],
    isPublic: true,
    isPaid: false,  // 是否收费
    qrCode: '',  // 社群二维码
    hosts: [] as UserSearchResult[],
  });

  // 封面图片上传
  const coverImageRef = useRef<HTMLInputElement>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCoverImagePreview(result);
      setFormData({ ...formData, coverImage: result });
    };
    reader.readAsDataURL(file);
  };

  const removeCoverImage = () => {
    setCoverImagePreview('');
    setFormData({ ...formData, coverImage: '' });
    if (coverImageRef.current) coverImageRef.current.value = '';
  };

  // 从后台设置获取共同体分类
  const adminCategories = useCategories();
  const communityCategories = adminCategories.community || [];

  // 动态获取分类名称（替代硬编码的 categoryLabels）
  const getCategoryName = (categoryId: string): string => {
    // 首先尝试从 communityCategories 中查找
    const found = communityCategories.find((c: Category) => c.id === categoryId);
    if (found) return found.name;
    
    // 后备映射：支持旧的 category 值（兼容示例数据）
    const fallbackLabels: Record<string, string> = {
      entrepreneurship: '创业',
      communication: '沟通',
      reading: '阅读',
      mindfulness: '正念',
    };
    return fallbackLabels[categoryId] || categoryId;
  };
  const categoryOptions = communityCategories.length > 0 
    ? communityCategories.map((c: Category) => ({ value: c.id, label: c.name }))
    : [
        { value: '1', label: '商业合作' },
        { value: '2', label: '技术交流' },
        { value: '3', label: '资源共享' },
        { value: '4', label: '创业投资' },
      ];

  // 生成简短的共同体ID（显示用）
  const getShortCommunityId = (id: string) => {
    return 'CMT' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  // 富文本格式化函数
  const formatText = (format: 'bold' | 'italic' | 'list' | 'link') => {
    const textarea = document.getElementById('community-description') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'list':
        newText = `\n- ${selectedText}`;
        cursorOffset = 3;
        break;
      case 'link':
        newText = `[${selectedText}](url)`;
        cursorOffset = 1;
        break;
    }

    setFormData({
      ...formData,
      description: text.substring(0, start) + newText + text.substring(end),
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectedText.length);
    }, 0);
  };

  // 添加组织者（通过 UserSelect 组件调用）
  const handleAddHost = (user: UserSearchResult) => {
    // 检查是否已经添加过
    if (formData.hosts.find(h => h.id === user.id)) {
      return;
    }
    setFormData({
      ...formData,
      hosts: [...formData.hosts, user],
    });
  };

  // 移除组织者
  const handleRemoveHost = (userId: string) => {
    setFormData({
      ...formData,
      hosts: formData.hosts.filter((h) => h.id !== userId),
    });
  };

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, result],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // 移除图片
  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // 处理二维码上传
  const handleQrCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        qrCode: result,
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 查看详情
  const handleViewDetail = (community: Community) => {
    setSelectedCommunity(community);
    setShowDetailModal(true);
  };

  // 创建/更新共同体
  const handleCreateCommunity = async () => {
    console.log('handleCreateCommunity 被调用');
    alert('handleCreateCommunity 被调用 - 开始创建流程');
    console.log('formData:', formData);
    
    if (!formData.name.trim()) {
      alert('请填写共同体名称');
      return;
    }

    // 直接从 localStorage 获取用户信息
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    console.log('token:', token ? '存在' : '不存在');
    console.log('userStr:', userStr ? '存在' : '不存在');
    alert(`token: ${token ? '存在' : '不存在'}, userStr: ${userStr ? '存在' : '不存在'}`);
    
    if (!token || !userStr) {
      alert('请先登录 - 没有token或user信息');
      return;
    }
    
    let currentUserId: string | undefined;
    try {
      const user = JSON.parse(userStr);
      currentUserId = user.id;
    } catch (e) {
      console.error('解析用户信息失败:', e);
    }
    
    if (!currentUserId) {
      alert('无法获取用户信息，请重新登录');
      return;
    }
    
    console.log('创建共同体 - 用户ID:', currentUserId);

    if (editingCommunity) {
      // 编辑模式
      try {
        const res = await fetch(`/api/communities?id=${editingCommunity.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            industry: formData.industry,
            coverImage: formData.coverImage,
            isPublic: formData.isPublic,
            isPaid: formData.isPaid,
            images: formData.images,
            qrCode: formData.qrCode,
            memberList: formData.hosts.map(h => ({
              id: h.id,
              name: h.display_name || h.real_name || '',
              role: 'admin',
              joinedAt: new Date().toISOString()
            })),
          }),
        });
        
        const data = await res.json();
        if (data.success) {
          await fetchCommunities();
          setEditingCommunity(null);
          setShowModal(false);
          alert('更新成功');
        } else {
          alert(data.error || '更新失败');
        }
      } catch (err) {
        console.error('更新共同体失败:', err);
        alert('更新失败，请重试');
      }
      return;
    }

    // 创建模式 - 调用 API
    try {
      const requestBody = {
        ownerId: currentUserId,
        name: formData.name,
        description: formData.description,
        coverImage: formData.coverImage,
        category: formData.category,
        industry: formData.industry,
        isPublic: formData.isPublic,
        isPaid: formData.isPaid,
        images: formData.images,
        qrCode: formData.qrCode,
      };
      console.log('发送创建请求，body:', JSON.stringify(requestBody));
      
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('API 响应状态:', res.status);
      const data = await res.json();
      console.log('API 响应数据:', data);
      console.log('data.id:', data.id);
      console.log('data.success:', data.success);
      
      if (data.success) {
        console.log('创建成功，准备显示弹窗，ID:', data.id);
        // 刷新列表
        await fetchCommunities();
        // 将新创建的社区加入已加入列表
        if (data.id) {
          setJoinedCommunities(prev => [...prev, data.id]);
          // 显示成功弹窗
          setCreatedCommunityId(data.id);
          console.log('setCreatedCommunityId 被调用，参数:', data.id);
        } else {
          console.error('API 返回成功但缺少 id 字段');
          alert('创建成功但返回数据异常');
        }
        // 重置表单并关闭模态框
        setFormData({
          name: '',
          category: 'entrepreneurship',
          industry: '',
          industryName: '',
          description: '',
          coverImage: '',
          images: [] as string[],
          isPublic: true,
          isPaid: false,
          qrCode: '',
          hosts: [] as UserSearchResult[],
        });
        setShowModal(false);
      } else {
        alert(data.error || '创建失败');
      }
    } catch (err) {
      console.error('创建共同体失败:', err);
      alert('创建失败，请重试');
    }
  };

  // 加入共同体
  const handleJoin = (id: string) => {
    const community = communities.find(c => c.id === id);
    if (!community) return;

    if (joinedCommunities.includes(id)) {
      // 退出
      setJoinedCommunities(joinedCommunities.filter(c => c !== id));
      setCommunities(communities.map(c => {
        if (c.id === id) {
          return {
            ...c,
            members: Math.max(1, c.members - 1),
            memberList: c.memberList.filter(m => m.email !== 'me@zhengdao.com')
          };
        }
        return c;
      }));
    } else {
      // 加入
      setJoinedCommunities([...joinedCommunities, id]);
      setCommunities(communities.map(c => {
        if (c.id === id) {
          return {
            ...c,
            members: c.members + 1,
            memberList: [...c.memberList, { name: '当前用户', email: 'me@zhengdao.com', role: 'member', joinedAt: new Date().toISOString().split('T')[0] }]
          };
        }
        return c;
      }));
    }
  };

  // 判断是否为创建的共同体（创建者角色）
  const isCreatedByMe = (community: Community) => {
    // 检查当前用户是否是创建者
    if (!currentUser) {
      console.log('isCreatedByMe: currentUser is null');
      return false;
    }
    const isOwner = community.ownerId === currentUser.id;
    const isCreator = community.memberList?.some(m => m.role === 'creator' && m.id === currentUser.id);
    console.log('isCreatedByMe:', { ownerId: community.ownerId, userId: currentUser.id, isOwner, isCreator });
    return isOwner || isCreator;
  };

  // 判断是否为参与的共同体（组织者角色：admin，不是创建者）
  const isJoinedByMe = (community: Community) => {
    // 判断成员列表中是否有组织者角色（admin），但不是创建者
    return community.memberList?.some(m => m.role === 'admin') || false;
  };

  // 根据标签页过滤共同体
  const filteredCommunities = communities.filter(community => {
    if (activeTab === 'created') return isCreatedByMe(community);
    if (activeTab === 'joined') return isJoinedByMe(community);
    if (activeTab === 'free') return !community.isPaid;
    if (activeTab === 'paid') return community.isPaid;
    return true; // 'all'
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* 共同体ID创建成功弹窗 */}
        <AnimatePresence>
          {createdCommunityId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
              onClick={() => setCreatedCommunityId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">共同体创建成功！</h3>
                <p className="text-slate-500 mb-4">您的共同体已成功创建</p>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 mb-6">
                  <p className="text-xs text-slate-500 mb-1">共同体ID</p>
                  <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                    {getShortCommunityId(createdCommunityId)}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">可用于分享和引用</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getShortCommunityId(createdCommunityId));
                      alert('ID已复制');
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />复制ID
                  </button>
                  <button
                    onClick={() => setCreatedCommunityId(null)}
                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm"
                  >
                    完成
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('communities.title')}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {t('communities.subtitle')}
              </p>
            </div>
            <button
              onClick={() => {
                console.log('创建共同体按钮点击');
                console.log('localStorage token:', localStorage.getItem('token') ? '存在' : '不存在');
                console.log('localStorage user:', localStorage.getItem('user') ? '存在' : '不存在');
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('communities.create')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 items-center">
          {/* 全部 + 免费/收费下拉 */}
          <div ref={feeFilterRef}>
            <button
              onClick={() => setShowFeeFilter(!showFeeFilter)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                activeTab === 'all' || activeTab === 'free' || activeTab === 'paid'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {activeTab === 'free' ? '免费' : activeTab === 'paid' ? '收费' : '全部'}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showFeeFilter && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowFeeFilter(false)} />
                <div
                  className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden"
                  style={{ top: feeFilterPos.top, left: feeFilterPos.left, width: feeFilterPos.width || 'auto' }}
                >
                  {[
                    { key: 'all', label: '全部' },
                    { key: 'free', label: '免费' },
                    { key: 'paid', label: '收费' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setActiveTab(opt.key as typeof activeTab);
                        setShowFeeFilter(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                        activeTab === opt.key
                          ? 'bg-amber-500 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {[
            { key: 'created', label: '我创建的' },
            { key: 'joined', label: '我参与的' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as typeof activeTab);
                setShowFeeFilter(false);
              }}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('communities.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-slate-500">加载中...</p>
          </div>
        )}

        {/* Communities Grid */}
        {!loading && filteredCommunities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredCommunities.map((community) => (
            <div
              key={community.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewDetail(community)}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users2 className="w-7 h-7 text-blue-600" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{community.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                        {getCategoryName(community.category)}
                      </span>
                      {community.industryName && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-400">
                          {community.industryName}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        community.isPaid
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {community.isPaid ? '收费' : '免费'}
                      </span>
                      {!community.isPublic && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
                          私密
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {community.description}
                  </p>
                  {community.images.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {community.images.slice(0, 3).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`图片${i + 1}`}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      ))}
                      {community.images.length > 3 && (
                        <span className="flex items-center justify-center w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-500">
                          +{community.images.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  {/* 操作按钮行 - 图标 only */}
                  <div className="flex items-center justify-end gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    {isCreatedByMe(community) && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('编辑按钮点击', community);
                            setEditingCommunity(community);
                            setFormData({
                              name: community.name,
                              category: community.category,
                              industry: community.industry || '',
                              industryName: community.industryName || '',
                              description: community.description,
                              coverImage: (community as any).coverImage || '',
                              images: community.images,
                              isPublic: community.isPublic,
                              isPaid: community.isPaid,
                              qrCode: community.qrCode || '',
                              hosts: community.memberList.filter(m => m.role === 'admin').map(m => ({
                                id: m.id || m.name,
                                phone: m.phone || '',
                                display_name: m.name,
                                real_name: m.name,
                                avatar_url: null,
                              })),
                            });
                            setCoverImagePreview((community as any).coverImage || '');
                            setShowModal(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                          title="修改"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            console.log('删除按钮点击', community.id);
                            if (confirm('确定要删除该共同体吗？')) {
                              try {
                                const token = localStorage.getItem('token');
                                const res = await fetch(`/api/communities?id=${community.id}`, {
                                  method: 'DELETE',
                                  headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                                });
                                const data = await res.json();
                                if (data.success) {
                                  setCommunities(communities.filter(c => c.id !== community.id));
                                  alert('删除成功');
                                } else {
                                  alert(data.error || '删除失败');
                                }
                              } catch (err) {
                                console.error('删除失败:', err);
                                alert('删除失败，请重试');
                              }
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleViewDetail(community)}
                      className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                      title="详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(community.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        joinedCommunities.includes(community.id)
                          ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                          : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                      }`}
                      title={joinedCommunities.includes(community.id) ? '退出' : '加入'}
                    >
                      {joinedCommunities.includes(community.id) ? <LogOut className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* 成员信息行 */}
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{community.members}{t('communities.members')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{community.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {!loading && filteredCommunities.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
            <Users2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              {activeTab === 'created' ? '您还没有创建任何共同体' : 
               activeTab === 'joined' ? '您还没有加入任何共同体' : 
               '暂无共同体'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowModal(false)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editingCommunity ? '编辑共同体' : '创建共同体'}</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingCommunity(null);
                    setCoverImagePreview('');
                    setFormData({
                      name: '',
                      category: 'entrepreneurship',
                      industry: '',
                      industryName: '',
                      description: '',
                      coverImage: '',
                      images: [] as string[],
                      isPublic: true,
                      isPaid: false,
                      qrCode: '',
                      hosts: [] as UserSearchResult[],
                    });
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      共同体名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入共同体名称"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      是否收费
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isPaid"
                          checked={!formData.isPaid}
                          onChange={() => setFormData({ ...formData, isPaid: false })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">免费</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isPaid"
                          checked={formData.isPaid}
                          onChange={() => setFormData({ ...formData, isPaid: true })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">收费</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      类型
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categoryOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-colors ${
                            formData.category === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={option.value}
                            checked={formData.category === option.value}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <IndustrySelect
                      value={formData.industry}
                      onChange={(id, name) => setFormData({ ...formData, industry: id, industryName: name })}
                      placeholder="请选择行业"
                      inline={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      封面图片
                    </label>
                    <input
                      ref={coverImageRef}
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
                        onClick={() => coverImageRef.current?.click()}
                        className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
                      >
                        <Image className="w-5 h-5" />
                        <span>点击上传封面图片</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      共同体介绍
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
                        <div className="w-px h-5 bg-slate-300 dark:bg-slate-500 mx-1" />
                      </div>
                      <textarea
                        id="community-description"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="请输入共同体介绍..."
                        className="w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      支持格式：**加粗**、*斜体*、- 列表、[文字](链接)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      添加组织者
                    </label>
                    <UserSelect
                      onSelect={handleAddHost}
                      selectedUsers={formData.hosts}
                      placeholder="搜索用户..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      社群二维码
                    </label>
                    {formData.qrCode ? (
                      <div className="relative inline-block">
                        <img src={formData.qrCode} alt="社群二维码" className="w-32 h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, qrCode: '' })}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => qrCodeInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        上传二维码
                      </button>
                    )}
                    <input
                      ref={qrCodeInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQrCodeUpload}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      可见性
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          checked={formData.isPublic}
                          onChange={() => setFormData({ ...formData, isPublic: true })}
                          className="w-4 h-4"
                        />
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">公开</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visibility"
                          checked={!formData.isPublic}
                          onChange={() => setFormData({ ...formData, isPublic: false })}
                          className="w-4 h-4"
                        />
                        <Users2 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">私密</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      console.log('创建按钮被点击');
                      handleCreateCommunity();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingCommunity ? '保存修改' : '创建'}
                  </button>
                </div>
              </div>
          </div>
        </>
          )}

      {showDetailModal && selectedCommunity && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowDetailModal(false)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
              <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">共同体详情</h2>
                  <div className="flex items-center gap-2">
                    <ShareButton 
                      targetType="community" 
                      targetId={selectedCommunity.id}
                      title={selectedCommunity.name}
                      description={selectedCommunity.description}
                    />
                    {isCreatedByMe(selectedCommunity) && (
                      <button
                        onClick={() => {
                          setEditingCommunity(selectedCommunity);
                          setFormData({
                            name: selectedCommunity.name,
                            category: selectedCommunity.category,
                            industry: selectedCommunity.industry || '',
                            industryName: selectedCommunity.industryName || '',
                            description: selectedCommunity.description,
                            coverImage: (selectedCommunity as any).coverImage || '',
                            images: selectedCommunity?.images || [] as string[],
                            isPublic: selectedCommunity.isPublic,
                            isPaid: selectedCommunity.isPaid,
                            qrCode: selectedCommunity.qrCode || '',
                            hosts: selectedCommunity.memberList.filter(m => m.role === 'admin').map(m => ({
                              id: m.id || m.name,
                              phone: m.phone || '',
                              display_name: m.name,
                              real_name: m.name,
                              avatar_url: null,
                            })),
                          });
                          setCoverImagePreview((selectedCommunity as any).coverImage || '');
                          setShowDetailModal(false);
                          setShowModal(true);
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        编辑
                      </button>
                    )}
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Users2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        {selectedCommunity.name}
                      </h1>
                      {/* 共同体ID */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded text-xs font-mono font-medium">
                          ID: {getShortCommunityId(selectedCommunity.id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                          {getCategoryName(selectedCommunity.category)}
                        </span>
                        {selectedCommunity.industryName && (
                          <span className="text-sm px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-700 dark:text-purple-400">
                            {selectedCommunity.industryName}
                          </span>
                        )}
                        <span className={`text-sm px-2 py-0.5 rounded ${
                          selectedCommunity.isPaid
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {selectedCommunity.isPaid ? '收费' : '免费'}
                        </span>
                        {!selectedCommunity.isPublic && (
                          <span className="text-sm px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
                            私密
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Globe className="w-5 h-5" />
                      {selectedCommunity.members}{t('communities.members')}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-5 h-5" />
                      {selectedCommunity.createdAt}
                    </div>
                  </div>

                  {selectedCommunity.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">共同体介绍</h3>
                      <div className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                        {selectedCommunity.description}
                      </div>
                    </div>
                  )}

                  {selectedCommunity.qrCode && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        社群二维码
                      </h3>
                      <div className="flex justify-center">
                        <img
                          src={selectedCommunity.qrCode}
                          alt="社群二维码"
                          className="w-48 h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Members Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      成员列表 ({selectedCommunity.memberList.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedCommunity.memberList.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                              <p className="text-xs text-slate-400">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              member.role === 'creator' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              member.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                            }`}>
                              {member.role === 'creator' ? '创建者' : member.role === 'admin' ? '管理员' : '成员'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activities Section */}
                  {selectedCommunity.activities.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        共同体活动 ({selectedCommunity.activities.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedCommunity.activities.map((activity) => (
                          <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{activity.title}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {activity.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {activity.time}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Users2 className="w-4 h-4" />
                              {activity.participants}人
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCommunity.images.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">共同体图片</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedCommunity.images.map((img, i) => (
                          <img
                            key={i}
                            src={img}
                            alt={`图片${i + 1}`}
                            className="w-full h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(img, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    关闭
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCommunity) handleJoin(selectedCommunity.id);
                      setShowDetailModal(false);
                    }}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      selectedCommunity && joinedCommunities.includes(selectedCommunity.id)
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {selectedCommunity && joinedCommunities.includes(selectedCommunity.id) ? '退出共同体' : t('communities.join')}
                  </button>
                </div>
              </div>
            </div>
        </>
          )}
    </Layout>
  );
}
