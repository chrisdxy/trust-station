"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Users2, Plus, Search, Globe, X, Bold, Italic, List, Link, Image, ImageIcon, Eye, Upload, Calendar, MapPin, Clock, User, Star, Edit, Trash2, ChevronDown, UserPlus, LogOut, CheckCircle, Copy, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, Category } from '@/hooks/useCategories';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { IndustrySelect } from '@/components/IndustrySelect';
import { WeChatShareSetup } from '@/components/WeChatShareSetup';
import AIWriter from '@/components/AIWriter';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

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
  status?: string;
  isPublic: boolean;
  qrCode?: string;  // 社群二维码
  coverImage?: string;  // 封面图片
  summary?: string;  // 概要
  ownerId?: string;  // 创建者ID
  ownerName?: string;  // 创建者名称
  isPinned?: number;
  sortOrder?: number;
  activityCount?: number;
}

export default function CommunitiesPage() {
  const { t } = useLanguage();
  const { user: currentUser, isAuthenticated, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);
  const descImageRef = useRef<HTMLInputElement>(null);  // 介绍区图片上传
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [pendingCommunities, setPendingCommunities] = useState<string[]>([]);
  const [joinReason, setJoinReason] = useState<string>('');
  const [joinReason2, setJoinReason2] = useState<string>('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinTarget, setJoinTarget] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 加载共同体列表
  const fetchCommunities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/communities${currentUser?.id ? '?userId=' + currentUser.id : ''}`);
      const data = await res.json();
      if (data.success) {
        const list = data.communities || [];
        setCommunities(list);
        // 同步 joinedCommunities：从 memberList 中找出当前用户已加入的社区
        if (currentUser?.id) {
          const joined = list
            .filter((c: Community) => c.memberList?.some(m => m.email === 'uid-' + currentUser.id))
            .map((c: Community) => c.id);
          setJoinedCommunities(joined);

          // 同步 pendingCommunities：查询待审批的申请
          try {
            const pendingRes = await fetch(`/api/communities/members?pending=true&userId=${currentUser.id}`);
            const pendingData = await pendingRes.json();
            if (pendingData.success && pendingData.requests) {
              setPendingCommunities(pendingData.requests.map((r: any) => r.community_id));
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('加载共同体列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // 支持从 URL 参数打开编辑（管理员从发布管理跳转）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId && communities.length > 0) {
      const community = communities.find(c => c.id === editId);
      if (community) {
        setEditingCommunity(community);
        setFormData({
          name: community.name,
          summary: community.summary || '',
          description: community.description || '',
          category: community.category || 'entrepreneurship',
          industry: community.industry || '',
          industryName: (community as any).industryName || '',
          coverImage: community.coverImage || '',
          images: community.images || [],
          isPublic: community.isPublic !== undefined ? community.isPublic : true,
          qrCode: community.qrCode || '',
          hosts: community.memberList?.filter((m: any) => m.role === 'admin' || m.role === 'creator').map((m: any) => ({
            id: m.id || m.email || '',
            phone: m.phone || '',
            display_name: m.name || null,
            real_name: null,
            avatar_url: null
          })) || []
        });
        setShowModal(true);
      }
    }
  }, [communities]);
  const [activeTab, setActiveTab] = useState<'all' | 'created' | 'joined'>('all');
  const [subFilter, setSubFilter] = useState<'all' | 'pinned' | 'active' | 'newest'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [createdCommunityId, setCreatedCommunityId] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    summary: '',
    category: 'entrepreneurship',
    industry: '',  // 行业ID
    industryName: '',  // 行业名称
    description: '',
    coverImage: '',
    images: [] as string[],
    isPublic: true,
    qrCode: '',  // 社群二维码
    hosts: [] as UserSearchResult[]
  });

  // 封面图片上传
  const coverImageRef = useRef<HTMLInputElement>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [qrPreview, setQrPreview] = useState<string>('');
  const uploadedCoverRef = useRef<string>('');  // 最新上传的图片 URL

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    // 先显示本地预览
    const reader = new FileReader();
    reader.onload = ev => setCoverImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // 上传到服务器
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      // 最低显示 800ms 确保动画可见
      await new Promise(r => setTimeout(r, 800));
      if (data.success) {
        uploadedCoverRef.current = data.url;
        setFormData(prev => ({ ...prev, coverImage: data.url }));
      } else {
        alert(data.error || '上传失败');
      }
    } catch {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removeCoverImage = () => {
    setCoverImagePreview('');
    setFormData({ ...formData, coverImage: '' });
    if (coverImageRef.current) coverImageRef.current.value = '';
  };

  // 删除共同体（弹出确认后执行）
  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/communities?id=${deleteTarget}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCommunities(prev => prev.filter(c => c.id !== deleteTarget));
      } else {
        alert(data.error || '删除失败');
      }
    } catch (err) {
      alert('删除失败');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
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
      mindfulness: '正念'
    };
    return fallbackLabels[categoryId] || categoryId;
  };
  const categoryOptions = communityCategories.length > 0 
    ? communityCategories.map((c: Category) => ({ value: c.id, label: c.name }))
    : [
        { value: '1', label: '商业合作' },
        { value: '2', label: '技术交流' },
        { value: '3', label: '资源共享' },
        { value: '4', label: '创业投资' }
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
      description: text.substring(0, start) + newText + text.substring(end)
    });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + selectedText.length);
    }, 0);
  };

  // 介绍区插入图片（上传后插入 Markdown 语法）
  const handleDescImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        const md = `\n![${file.name}](${data.url})\n`;
        setFormData(prev => ({ ...prev, description: prev.description + md }));
      } else {
        alert(data.error || '上传图片失败');
      }
    } catch {
      alert('上传失败');
    }
    // 重置 input 以便重复上传同一文件
    if (descImageRef.current) descImageRef.current.value = '';
  };

  // 添加组织者（通过 UserSelect 组件调用）
  const handleAddHost = (user: UserSearchResult) => {
    // 检查是否已经添加过
    if (formData.hosts.find(h => h.id === user.id)) {
      return;
    }
    setFormData({
      ...formData,
      hosts: [...formData.hosts, user]
    });
  };

  // 移除组织者
  const handleRemoveHost = (userId: string) => {
    setFormData({
      ...formData,
      hosts: formData.hosts.filter(h => h.id !== userId)
    });
  };

  // 简易 Markdown → HTML（支持图片、文件链接、粗体、斜体）
  const renderDescription = (text: string) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // 图片 ![alt](url) — 处理相对路径
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      const fullUrl = url.startsWith('/') ? 'https://myfriends.vip' + url : url;
      return `<img src="${fullUrl}" alt="${alt}" style="max-width:100%;height:auto;margin:8px 0;border-radius:8px" />`;
    });
    // 文件/PPT/PDF 链接 [text](url) — 处理相对路径
    html = html.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, url) => {
      const fullUrl = url.startsWith('/') ? 'https://myfriends.vip' + url : url;
      return `<a href="${fullUrl}" target="_blank" style="color:#3b82f6;text-decoration:underline">${text}</a>`;
    });
    // 粗体 **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体 *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 换行
    html = html.replace(/\n/g, '<br/>');
    return html;
  };

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(async file => {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, result]
        }));
      };
      reader.readAsDataURL(file);
      // 上传到服务器
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          images: prev.images.map((img, i) => i === prev.images.length - 1 ? data.url : img)
        }));
      }
    });
  };

  // 移除图片
  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // 处理二维码上传
  const handleQrCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 本地预览（仅用于UI展示，不存入formData）
    const reader = new FileReader();
    reader.onload = event => {
      setQrPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    // 上传到服务器
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      setFormData(prev => ({ ...prev, qrCode: data.url }));
    } else {
      alert(data.error || '上传二维码失败');
    }
    e.target.value = '';
  };

  // 查看详情（仅正式成员和创建者可查看）
  const handleViewDetail = (community: Community) => {
    if (!currentUser?.id) {
      alert('请先登录');
      return;
    }
    const isMyCommunity = isCreatedByMe(community) || joinedCommunities.includes(community.id);
    if (!isMyCommunity) {
      // 非成员点击卡片直接弹出申请加入弹窗
      setJoinTarget(community);
      setShowJoinModal(true);
      return;
    }
    setSelectedCommunity(community);
    setShowDetailModal(true);
  };

  // 创建/更新共同体（通过云 MySQL API，不依赖 localStorage）
  const handleCreateCommunity = async () => {
    if (!formData.name.trim()) {
      alert('请填写共同体名称');
      return;
    }
    if (!currentUser?.id) {
      alert('请先登录');
      return;
    }

    setSaving(true);
    if (editingCommunity) {
      // 编辑模式 - 调用云数据库 API
      try {
        const res = await fetch(`/api/communities?id=${editingCommunity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            summary: formData.summary,
            description: formData.description,
            category: formData.category,
            industry: formData.industry,
            coverImage: uploadedCoverRef.current || formData.coverImage,
            isPublic: formData.isPublic,
            images: formData.images,
            qrCode: formData.qrCode,
            memberList: formData.hosts.map(h => ({
              id: h.id,
              name: h.display_name || h.real_name || '',
              role: 'admin',
              joinedAt: new Date().toISOString()
            }))
          })
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
        alert('更新失败');
      } finally {
        setSaving(false);
      }
      return;
    }

    // 创建模式
    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          ownerId: currentUser.id,
          ownerName: (currentUser as any).display_name || (currentUser as any).real_name || '',
          name: formData.name,
          summary: formData.summary,
          description: formData.description,
          coverImage: formData.coverImage,
          category: formData.category,
          industry: formData.industry,
          isPublic: formData.isPublic,
          images: formData.images,
          qrCode: formData.qrCode
        })
      });

      const data = await res.json();
      
      if (data.success) {
        await fetchCommunities();
        if (data.id) {
          setJoinedCommunities(prev => [...prev, data.id]);
          setCreatedCommunityId(data.id);
        }
        setFormData({
          name: '',
          summary: '',
          category: 'entrepreneurship',
          industry: '',
          industryName: '',
          description: '',
          coverImage: '',
          images: [] as string[],
          isPublic: true,
          qrCode: '',
          hosts: [] as UserSearchResult[]
        });
        setShowModal(false);
      } else {
        alert(data.error || '创建失败');
      }
    } catch (err) {
      alert('创建失败');
    } finally {
      setSaving(false);
    }
  };

  // 加入共同体
  const handleJoin = async (id: string) => {
    const community = communities.find(c => c.id === id);
    if (!community || !currentUser?.id) return;

    const isJoined = joinedCommunities.includes(id);
    const isPending = pendingCommunities.includes(id);
    
    // 如果已有待审批申请，不允许重复提交
    if (isPending) {
      alert('您的加入申请正在等待管理员审批');
      return;
    }
    
    try {
      const res = await fetch('/api/communities/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: id,
          userId: currentUser.id,
          userName: currentUser.display_name || currentUser.phone || '用户',
          reason: joinReason || '',
          action: isJoined ? 'leave' : 'join'
        })
      });
      const data = await res.json();
      if (data.success) {
        if (isJoined) {
          setJoinedCommunities(joinedCommunities.filter(c => c !== id));
          const updatedList = communities.map(c => {
            if (c.id === id) return { ...c, members: Math.max(0, c.members - 1), memberList: c.memberList.filter(m => m.email !== ('uid-' + currentUser.id)) };
            return c;
          });
          setCommunities(updatedList);
          setSelectedCommunity(prev => prev?.id === id ? { ...prev, members: Math.max(0, prev.members - 1), memberList: prev.memberList.filter(m => m.email !== ('uid-' + currentUser.id)) } : prev);
        } else if (data.status === 'pending') {
          // 提交申请成功，待审批
          setPendingCommunities([...pendingCommunities, id]);
          setJoinReason('');
          setJoinReason2('');
          alert('加入申请已提交，请等待管理员审批');
        } else {
          // 直接加入成功（兼容旧流程）
          setJoinedCommunities([...joinedCommunities, id]);
          const newMember = { name: currentUser.display_name || currentUser.phone || '用户', email: 'uid-' + currentUser.id, role: 'member' as const, joinedAt: new Date().toISOString().split('T')[0] };
          const updatedList = communities.map(c => {
            if (c.id === id) return { ...c, members: c.members + 1, memberList: [...c.memberList, newMember] };
            return c;
          });
          setCommunities(updatedList);
          setSelectedCommunity(prev => prev?.id === id ? { ...prev, members: prev.members + 1, memberList: [...prev.memberList, newMember] } : prev);
        }
      } else {
        alert(data.error || '操作失败');
      }
    } catch (e) {
      console.error('加入/退出失败:', e);
      alert('网络错误，请重试');
    }
  };

  // 判断是否为创建的共同体（创建者角色）
  const isCreatedByMe = (community: Community) => {
    if (!currentUser?.id || !community.ownerId) return false;
    // 兼容 ownerId 可能不带 UID 前缀的情况
    const currentId = currentUser.id;
    const ownerId = community.ownerId;
    return currentId === ownerId || currentId === 'UID' + ownerId || 'UID' + currentId === ownerId;
  };

  // 判断是否为参与的共同体（在成员列表中，不是创建者）
  const isJoinedByMe = (community: Community) => {
    if (!currentUser?.id) return false;
    return community.memberList?.some(m => m.email === 'uid-' + currentUser.id && m.role !== 'creator') || false;
  };

  // 根据标签页过滤共同体
  const filteredCommunities = communities.filter(community => {
    if (activeTab === 'created') return isCreatedByMe(community);
    if (activeTab === 'joined') return isJoinedByMe(community);
    // 'all' 标签下的子筛选
    if (subFilter === 'pinned') return community.isPinned || (community.sortOrder ?? 0) > 0;
    if (subFilter === 'active') return (community.activityCount ?? 0) >= 2; // 每周2次以上活动
    if (subFilter === 'newest') return true; // 按时间排序，不需要过滤
    return true;
  }).filter(community => {
    // 搜索过滤
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (community.name?.toLowerCase().includes(q) || community.summary?.toLowerCase().includes(q));
  });

  // 子筛选排序
  const sortedCommunities = [...filteredCommunities].sort((a, b) => {
    if (activeTab === 'all' && subFilter === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (activeTab === 'all' && subFilter === 'active') {
      return (b.activityCount || 0) - (a.activityCount || 0);
    }
    // 默认：置顶的排前面
    return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto py-20 text-center">
          <p className="text-slate-500">加载中...</p>
        </div>
      </Layout>
    );
  }

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
                onClick={e => e.stopPropagation()}
              >
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">共同体创建成功！</h3>
                <p className="text-amber-600 dark:text-amber-400 mb-4 flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />已提交，等待管理员审核通过后公开可见
                </p>
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
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('communities.create')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 items-center">

          {[
            { key: 'all', label: '全部' },
            { key: 'created', label: '我创建的' },
            { key: 'joined', label: '我参与的' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as typeof activeTab);
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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索共同体..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* 筛选子标签（仅"全部"标签页显示） */}
        {activeTab === 'all' && (
          <div className="flex gap-2 mb-4">
            {[
              { key: 'all', label: '全部' },
              { key: 'pinned', label: '置顶' },
              { key: 'active', label: '最活跃' },
              { key: 'newest', label: '最新的' }
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSubFilter(key as typeof subFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  subFilter === key ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >{label}</button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-slate-500">加载中...</p>
          </div>
        )}

        {/* Communities Grid */}
        {!loading && sortedCommunities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedCommunities.map(community => (
            <div
              key={community.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewDetail(community)}
            >
              <div className="flex items-start gap-4">
                {community.coverImage ? (
                  <img src={community.coverImage} alt={community.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users2 className="w-7 h-7 text-blue-600" />
                  </div>
                )}
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
                      {!community.isPublic && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
                          私密
                        </span>
                      )}
                      {community.status === 'pending' && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />待审批
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono cursor-pointer hover:bg-amber-200 transition-colors mt-1"
                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(getShortCommunityId(community.id)); }}
                    title="点击复制共同体ID，用于记录中心查询">
                    共同体ID: {getShortCommunityId(community.id)}
                  </span>
                  {community.summary && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 line-clamp-2 font-medium">
                      {community.summary}
                    </p>
                  )}
                  {community.ownerName && (
                    <p className="text-xs text-slate-400 mt-1">
                      创建人：{community.ownerName}
                    </p>
                  )}
                  {/* 成员状态 */}
                  <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {isCreatedByMe(community) ? (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">创建者</span>
                    ) : joinedCommunities.includes(community.id) ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">正式成员</span>
                    ) : pendingCommunities.includes(community.id) ? (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">待审批</span>
                    ) : null}
                  </div>

                  {/* 成员信息行 */}
                  <div className="flex items-center gap-3 text-sm text-slate-500 mt-2" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">{community.memberList?.length || community.members}{t('communities.members')}</span>
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

        {!loading && sortedCommunities.length === 0 && (
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
              onClick={e => e.stopPropagation()}
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
                      summary: '',
                      category: 'entrepreneurship',
                      industry: '',
                      industryName: '',
                      description: '',
                      coverImage: '',
                      images: [] as string[],
                      isPublic: true,
                      qrCode: '',
                      hosts: [] as UserSearchResult[]
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
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入共同体名称"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      概要
                    </label>
                    <textarea
                      value={formData.summary}
                      onChange={e => setFormData({ ...formData, summary: e.target.value })}
                      placeholder="简要介绍共同体的宗旨、目标和原则"
                      rows={2}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      类型
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {categoryOptions.map(option => (
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
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
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
                      <div className="relative inline-block w-full">
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
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
                        disabled={uploading}
                        className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors disabled:opacity-60"
                      >
                        {uploading ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /><span>上传中...</span></>
                        ) : (
                          <><Image className="w-5 h-5" /><span>点击上传封面图片</span></>
                        )}
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
                        <button
                          type="button"
                          onClick={() => descImageRef.current?.click()}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                          title="上传图片"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <input ref={descImageRef} type="file" accept="image/*" onChange={handleDescImageUpload} className="hidden" />
                        <div className="flex-1" />
                        <AIWriter
                          onResult={(text) => setFormData({ ...formData, description: text })}
                          prompt="请为共同体撰写一份吸引人的介绍，包括共同体宗旨、目标人群、活动形式和加入价值。要求语言真诚、有感染力。"
                          context={`共同体名称：${formData.name}，概要：${formData.summary}，当前已有内容：${(formData.description || '').slice(0, 200)}`}
                          label="AI 写介绍"
                          buttonText="AI 写介绍"
                        />
                      </div>
                      <textarea
                        id="community-description"
                        rows={4}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="请输入共同体介绍..."
                        className="w-full px-4 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      🖼️ 插入图片 · **加粗** · *斜体* · [链接](url)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      添加组织者
                    </label>
                    <UserSelect
                      onSelect={handleAddHost}
                      onRemove={handleRemoveHost}
                      selectedUsers={formData.hosts}
                      placeholder="搜索用户..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      社群二维码
                    </label>
                    {formData.qrCode || qrPreview ? (
                      <div className="relative inline-block">
                        <img src={qrPreview || formData.qrCode} alt="社群二维码" className="w-32 h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => { setFormData({ ...formData, qrCode: '' }); setQrPreview(''); }}
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
                    onClick={handleCreateCommunity}
                    disabled={saving || uploading}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? '上传中...' : saving ? '保存中...' : editingCommunity ? '保存修改' : '创建'}
                  </button>
                </div>
              </div>
          </div>
        </>
          )}

      {showDetailModal && selectedCommunity && (
        <>
          <WeChatShareSetup title={selectedCommunity.name} description={selectedCommunity.summary || selectedCommunity.description?.replace(/<[^>]*>/g, '').slice(0, 200)} imageUrl={selectedCommunity.coverImage || selectedCommunity.images?.[0] || ''} link={window.location.origin + '/communities?view=' + selectedCommunity.id} />
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
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">共同体详情</h2>
                  <div className="flex items-center gap-2">
                    {isCreatedByMe(selectedCommunity) && (
                      <button
                        onClick={() => {
                          setEditingCommunity(selectedCommunity);
                          setFormData({
                            name: selectedCommunity.name,
                            summary: selectedCommunity.summary || '',
                            category: selectedCommunity.category,
                            industry: selectedCommunity.industry || '',
                            industryName: selectedCommunity.industryName || '',
                            description: selectedCommunity.description,
                            coverImage: selectedCommunity.coverImage || '',
                            images: selectedCommunity?.images || [] as string[],
                            isPublic: selectedCommunity.isPublic,
                            qrCode: selectedCommunity.qrCode || '',
                            hosts: selectedCommunity.memberList.filter(m => m.role === 'admin').map(m => ({
                              id: m.id || m.name,
                              phone: m.phone || '',
                              display_name: m.name,
                              real_name: m.name,
                              avatar_url: null
                            }))
                          });
                          setCoverImagePreview(selectedCommunity.coverImage || '');
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
                    {selectedCommunity.coverImage ? (
                      <img src={selectedCommunity.coverImage} alt={selectedCommunity.name} className="w-24 h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <Users2 className="w-8 h-8 text-blue-600" />
                      </div>
                    )}
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
                        {!selectedCommunity.isPublic && (
                          <span className="text-sm px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-600 dark:text-amber-400">
                            私密
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 创建人 */}
                  {selectedCommunity.ownerName && (
                    <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <User className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">创建人：</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{selectedCommunity.ownerName}</span>
                    </div>
                  )}

                  {/* 简介 */}
                  {selectedCommunity.summary && (
                    <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl">
                      <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">简介</h4>
                      <p className="text-slate-700 dark:text-slate-300 text-sm">{selectedCommunity.summary}</p>
                    </div>
                  )}

                  {/* 待审批申请（仅管理员/创建者可见） */}
                  {selectedCommunity && isCreatedByMe(selectedCommunity) && (
                    <PendingApprovals
                      communityId={selectedCommunity.id}
                      onApprove={() => fetchCommunities()}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <button
                      onClick={() => setShowMembersModal(true)}
                      className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <Globe className="w-5 h-5" />
                      <span>{selectedCommunity.memberList?.length || selectedCommunity.members} 位成员</span>
                    </button>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Calendar className="w-5 h-5" />
                      {selectedCommunity.createdAt}
                    </div>
                  </div>

                  {selectedCommunity.description && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">共同体介绍</h3>
                      <div className="text-slate-600 dark:text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderDescription(selectedCommunity.description) }} />
                    </div>
                  )}

                  {selectedCommunity.qrCode && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" />
                        社群二维码
                      </h3>
                      <div className="flex flex-col items-center gap-3">
                        <img
                          id="community-qrcode-img"
                          src={selectedCommunity.qrCode?.startsWith('/') ? 'https://myfriends.vip' + selectedCommunity.qrCode : selectedCommunity.qrCode}
                          alt="社群二维码"
                          crossOrigin="anonymous"
                          onClick={() => setQrPreviewUrl(selectedCommunity.qrCode?.startsWith('/') ? 'https://myfriends.vip' + selectedCommunity.qrCode : (selectedCommunity.qrCode ?? null))}
                          className="w-48 h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      </div>
                    </div>
                  )}

                  {/* 二维码图片预览弹窗 */}
                  {qrPreviewUrl && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
                      onClick={() => setQrPreviewUrl(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="relative max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setQrPreviewUrl(null)}
                          className="absolute -top-3 -right-3 p-1.5 bg-slate-700 text-white rounded-full hover:bg-slate-600 z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <img
                          src={qrPreviewUrl}
                          alt="社群二维码"
                          className="w-full h-auto object-contain rounded-xl"
                        />
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = qrPreviewUrl;
                            a.download = '社群二维码.png';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="mt-4 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          下载图片
                        </button>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Activities Section */}
                  {selectedCommunity.activities.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        共同体活动 ({selectedCommunity.activities.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedCommunity.activities.map(activity => (
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

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  {selectedCommunity && !isCreatedByMe(selectedCommunity) && (
                    <div>
                      {pendingCommunities.includes(selectedCommunity.id) ? (
                        <div className="flex items-center gap-2 text-amber-600">
                          <Clock className="w-5 h-5" />
                          <span className="font-medium">待审批</span>
                        </div>
                      ) : joinedCommunities.includes(selectedCommunity.id) ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">正式成员</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="flex gap-3 ml-auto">
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
        </>
          )}

      {/* 成员清单弹窗 */}
      <AnimatePresence>
        {showMembersModal && selectedCommunity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            onClick={() => setShowMembersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  成员清单 ({selectedCommunity.memberList.length})
                </h3>
                <button onClick={() => setShowMembersModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedCommunity.memberList.length > 0 ? (
                  selectedCommunity.memberList.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="font-medium text-sm text-slate-900 dark:text-white">{member.name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        member.role === 'creator' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        member.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {member.role === 'creator' ? '创建者' : member.role === 'admin' ? '管理员' : '成员'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">暂无成员</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    {/* 删除确认弹窗 */}
    <AnimatePresence>
      {deleteTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">确认删除</h3>
              <p className="text-sm text-slate-500">
                确定要删除该共同体吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />删除中...</>
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* 申请加入弹窗 */}
    <AnimatePresence>
      {showJoinModal && joinTarget && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowJoinModal(false); setJoinReason(''); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">申请加入 - {joinTarget.name}</h3>
              <p className="text-sm text-slate-500 mb-4">请填写申请理由，管理员审核通过后即可成为正式成员</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">自查是否符合共同体加入条件</label>
                  <input
                    value={joinReason}
                    onChange={e => setJoinReason(e.target.value)}
                    placeholder="请自查是否满足该共同体的加入条件，并简要说明..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">为什么想加入</label>
                  <textarea
                    value={joinReason2}
                    onChange={e => setJoinReason2(e.target.value)}
                    placeholder="为什么想加入该共同体？希望获得什么？..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => { setShowJoinModal(false); setJoinReason(''); setJoinReason2(''); }}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (!joinReason.trim() || !joinReason2.trim()) {
                    alert('请填写自查条件与加入理由');
                    return;
                  }
                  const fullReason = `【行业专长】${joinReason}\n【加入理由】${joinReason2}`;
                  setJoinReason(fullReason);
                  handleJoin(joinTarget.id);
                  setShowJoinModal(false);
                  setJoinReason2('');
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                提交申请
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </Layout>
  );
}

// 待审批成员列表组件
function PendingApprovals({ communityId, onApprove }: { communityId: string; onApprove: () => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await fetch(`/api/communities/members?communityId=${communityId}&pending=true`);
        const data = await res.json();
        if (data.success) setRequests(data.requests || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, [communityId]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessing(requestId);
    try {
      const res = await fetch('/api/communities/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      });
      const data = await res.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        if (onApprove) onApprove();
      } else {
        alert(data.error || '操作失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
      <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3">
        待审批申请 ({requests.length})
      </h4>
      <div className="space-y-2">
        {requests.map((req: any) => (
          <div key={req.id} className="p-3 bg-white dark:bg-slate-700/50 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-slate-900 dark:text-white">
                  {req.display_name || req.real_name || req.user_name || req.user_id}
                </p>
                <p className="text-xs text-slate-400">{req.phone || ''}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => handleAction(req.id, 'approve')}
                  disabled={processing === req.id}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg disabled:opacity-50"
                >
                  {processing === req.id ? '处理中...' : '通过'}
                </button>
                <button
                  onClick={() => handleAction(req.id, 'reject')}
                  disabled={processing === req.id}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg disabled:opacity-50"
                >
                  拒绝
                </button>
              </div>
            </div>
            {req.reason && (
              <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded mt-1">
                申请理由：{req.reason}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
