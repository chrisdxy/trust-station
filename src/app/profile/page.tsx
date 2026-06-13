"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Edit, FileText, Users2 as UsersIcon, X, Check, Camera, Save, Plus, UserCircle, Building, Award, Globe, EyeOff, Trash2, Share2, Scale, ChevronDown, Loader2, Clock, CheckCircle, Upload, Mail, Smartphone, Sparkles, Handshake, TrendingUp, Briefcase, Calendar, Image as ImageIcon, Eye } from 'lucide-react';
import Layout from '@/components/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { useCategories } from '@/hooks/useCategories';
import AIWriter from '@/components/AIWriter';
import AISummary from '@/components/AISummary';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { profile, updateProfile, user, revalidateSession } = useAuth();
  const { publicProfiles, setPublicProfiles } = useData();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCardEditModal, setShowCardEditModal] = useState(false);
  const [editingCard, setEditingCard] = useState<{
    id: string;
    type: 'personal' | 'enterprise' | 'expert' | 'partner';
    fields: Record<string, string>;
    phoneNumbers: string[];
    isPublic: boolean;
  } | null>(null);
  const [createForm, setCreateForm] = useState<{
    type: 'personal' | 'enterprise' | 'expert' | 'partner' | 'coach';
    fields: Record<string, string>;
    phoneNumbers: string[];
    isPublic: boolean;
  }>({
    type: 'personal',
    fields: {},
    phoneNumbers: [],
    isPublic: true
  });
  const [editForm, setEditForm] = useState({
    display_name: '',
    real_name: '',
    company_name: '',
    phone: '',
    email: ''
  });

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
        console.error('获取名片列表失败:', err);
      }
    };

    fetchProfiles();

    // 加载组织活动统计
    const fetchOrgStats = async () => {
      try {
        const res = await fetch(`/api/profile/stats?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setOrgStats(data.stats);
        }
      } catch (err) {
        console.error('获取组织统计失败:', err);
      }
    };
    fetchOrgStats();
  }, [user?.id]);

  // 富文本编辑器图片上传
  const [uploadingImage, setUploadingImage] = useState(false);
  const [trustScore, setTrustScore] = useState<string>('');
  const [scoreLoading, setScoreLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // 处理富文本编辑器图片插入
  const handleInsertImage = (fieldKey: string) => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 检查文件大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // 将图片转换为 base64
      const reader = new FileReader();
      reader.onload = event => {
        const base64Image = event.target?.result as string;
        const imageMarkdown = `\n![图片](${base64Image})\n`;
        
        // 在当前光标位置插入图片
        const textarea = document.getElementById(`bio-editor-${createForm.type}`) as HTMLTextAreaElement;
        if (textarea) {
          const start = textarea.selectionStart;
          const text = textarea.value;
          const newText = text.substring(0, start) + imageMarkdown + text.substring(start);
          setCreateForm(prev => ({ ...prev, fields: { ...prev.fields, [fieldKey]: newText } }));
          setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length); }, 0);
        }
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert('图片读取失败');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('图片上传失败');
      setUploadingImage(false);
    }

    // 清空 input 以允许重复选择同一文件
    e.target.value = '';
  };

  // 协调专家相关状态
  const [mediatorProfile, setMediatorProfile] = useState<{
    isMediator: boolean;
    status: 'pending' | 'approved' | 'suspended' | 'none';
    name: string;
    type: string;
    expertise: string[];
    description: string;
    caseCount: number;
    successRate: number;
  } | null>(null);
  const [showMediatorModal, setShowMediatorModal] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachProfile, setCoachProfile] = useState<{
    isCoach: boolean;
    status: 'pending' | 'approved' | 'suspended' | 'none';
    name: string; type: string; expertise: string[]; description: string;
  } | null>(null);
  const [coachForm, setCoachForm] = useState({ type: '', expertise: [] as string[], customExpertise: '', description: '' });
  const [mediatorForm, setMediatorForm] = useState({
    type: '',
    expertise: [] as string[],
    customExpertise: '',
    description: ''
  });
  const [isSubmittingMediator, setIsSubmittingMediator] = useState(false);

  // 协调案件数据
  const [mediationCases, setMediationCases] = useState<Array<{
    id: string;
    caseNumber: string;
    title: string;
    type: string;
    status: string;
    progress: number;
    parties: string[];
    applicant_name: string;
    respondent_name: string;
    description: string;
    relationship: string;
    createTime: string;
    updateTime: string;
    result?: string;
    feedback?: string;
    comments?: Array<{ id: string; author: string; content: string; time: string }>;
    expanded?: boolean;
  }>>([]);
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});

  // 从 API 加载协调专家本人的案件
  const loadMediationCases = async () => {
    if (!user?.id || !mediatorProfile?.isMediator) return;
    try {
      const res = await fetch(`/api/mediations?assignedTo=${encodeURIComponent(mediatorProfile.name || user.display_name || '')}`);
      const data = await res.json();
      if (data.success) {
        setMediationCases((data.mediations || []).map((m: any) => ({
          id: m.id,
          caseNumber: m.id?.slice(0, 8).toUpperCase(),
          title: m.title || '未命名',
          type: m.dispute_type || '协调',
          status: m.status || 'pending',
          progress: m.status === 'resolved' || m.status === 'archived' ? 100 : m.status === 'ongoing' ? 60 : 10,
          parties: [m.applicant_name, m.respondent_name].filter(Boolean),
          applicant_name: m.applicant_name || '',
          respondent_name: m.respondent_name || '',
          description: m.description || '',
          relationship: m.relationship || '',
          createTime: m.created_at || '',
          updateTime: m.updated_at || '',
          result: m.result || '',
          feedback: m.feedback || '',
          comments: [],
          expanded: false
        })));
      }
    } catch {}
  };
  // 加载协调专家本人的案件（从 API）
  React.useEffect(() => {
    if (mediatorProfile?.status === 'approved') {
      loadMediationCases();
    }
  }, [mediatorProfile?.status, user?.id]);

  const toggleExpand = (id: string) => {
    setMediationCases(prev => prev.map(c => c.id === id ? { ...c, expanded: !c.expanded } : { ...c, expanded: false }));
  };

  // 合伙人相关状态
  const [partnerProfile, setPartnerProfile] = useState<{
    isPartner: boolean;
    status: 'pending' | 'approved' | 'rejected' | 'none';
    level: string;
    region: string;
    businessPlan: string;
    submittedAt: string;
  } | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    level: '',
    region: '',
    businessPlan: ''
  });
  const [isSubmittingPartner, setIsSubmittingPartner] = useState(false);

  // 认证相关状态
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyType, setVerifyType] = useState<'personal'>('personal');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    realName: '',
    idNumber: '',
    facePhoto: '' // 人脸照片 base64
  });

  // 个人认证状态
  const [personalVerified, setPersonalVerified] = useState(!!(user as any)?.identity_verified);
  const [verifyResult, setVerifyResult] = useState<{ score?: number; message?: string } | null>(null);

  // 页面加载时从 API 拉取最新认证状态
  React.useEffect(() => {
    if (!user?.id) return;
    const fetchLatestStatus = async () => {
      try {
        const res = await fetch(`/api/auth/me?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          const isVerified = !!(data.user as any)?.identity_verified;
          setPersonalVerified(isVerified);
          // 同步到 localStorage
          if (isVerified) {
            try {
              const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
              if (!savedUser.identity_verified) {
                savedUser.identity_verified = true;
                localStorage.setItem('user', JSON.stringify(savedUser));
              }
            } catch {}
          }
        }
      } catch {}
    };
    fetchLatestStatus();
  }, [user?.id]);

  // 从后台设置获取协调专家类型
  const adminCategories = useCategories();
  const expertTypes = adminCategories.mediator_type?.map(c => c.name) || ['民事协调', '商事协调', '劳动协调'];
  const expertiseAreas = adminCategories.expertise_area?.map(c => c.name) || ['合同纠纷', '债务纠纷', '房产纠纷', '知识产权'];

  // 初始化协调专家数据（从 API 获取最新状态）
  React.useEffect(() => {
    const loadMediator = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/mediators?userId=${user.id}`);
        const data = await res.json();
        if (data.success && data.mediators?.length > 0) {
          const m = data.mediators[0];
          setMediatorProfile({
            isMediator: m.status === 'approved',
            status: m.status,
            name: m.name || '',
            type: m.type || '',
            expertise: typeof m.expertise === 'string' ? JSON.parse(m.expertise) : (m.expertise || []),
            description: m.description || '',
            caseCount: m.case_count || 0,
            successRate: m.success_rate || 0
          });
        }
      } catch { /* fallback to localStorage */ }
    };
    loadMediator();

    // 加载陪跑专家状态
    const loadCoach = async () => {
      try {
        const res = await fetch(`/api/coach?userId=${user?.id}`);
        const data = await res.json();
        if (data.success && data.coaches?.length > 0) {
          const c = data.coaches[0];
          setCoachProfile({
            isCoach: c.status === 'approved',
            status: c.status,
            name: c.name || '',
            type: c.type || '',
            expertise: typeof c.expertise === 'string' ? JSON.parse(c.expertise) : (c.expertise || []),
            description: c.description || ''
          });
        }
      } catch {}
    };
    loadCoach();
  }, [user?.id]);

  // 保存协调专家申请
  const handleSubmitMediator = async () => {
    if (!mediatorForm.type) {
      alert('请选择协调专家类型');
      return;
    }
    if (!mediatorForm.description.trim()) {
      alert('请填写个人简介及擅长领域描述');
      return;
    }

    setIsSubmittingMediator(true);
    
    const allExpertise = mediatorForm.customExpertise.trim()
      ? [...mediatorForm.expertise, mediatorForm.customExpertise.trim()]
      : mediatorForm.expertise;
    
    try {
      const res = await fetch('/api/mediators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: user?.real_name || user?.display_name || '',
          phone: user?.phone || '',
          email: user?.email || '',
          type: mediatorForm.type,
          expertise: allExpertise,
          description: mediatorForm.description
        })
      });
      const data = await res.json();
      if (!data.success) { alert(data.error || '提交失败'); return; }
    } catch { alert('网络错误，请重试'); return; }
    
    const newProfile = {
      isMediator: true,
      status: 'pending' as const,
      name: user?.real_name || user?.display_name || '',
      type: mediatorForm.type,
      expertise: allExpertise,
      description: mediatorForm.description,
      caseCount: 0,
      successRate: 0
    };
    
    setMediatorProfile(newProfile);
    setIsSubmittingMediator(false);
    setShowMediatorModal(false);
    setMediatorForm({ type: '', expertise: [], customExpertise: '', description: '' });
    
    alert('协调专家申请已提交，请等待管理员审核');
  };

  // 保存陪跑专家申请
  const handleSubmitCoach = async () => {
    if (!coachForm.description.trim()) {
      alert('请填写个人简介及擅长领域描述');
      return;
    }
    setIsSubmittingMediator(true);
    const allExpertise = coachForm.customExpertise.trim()
      ? [...coachForm.expertise, coachForm.customExpertise.trim()]
      : coachForm.expertise;
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        name: user?.real_name || user?.display_name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        type: coachForm.type || '战略陪跑',
        expertise: allExpertise,
        description: coachForm.description
      })
    });
    const data = await res.json();
    if (!data.success) { alert(data.error || '提交失败'); setIsSubmittingMediator(false); return; }
    setCoachProfile({
      isCoach: false,
      status: 'pending',
      name: user?.real_name || user?.display_name || '',
      type: coachForm.type || '战略陪跑',
      expertise: allExpertise,
      description: coachForm.description
    });
    setIsSubmittingMediator(false);
    setShowCoachModal(false);
    setCoachForm({ type: '', expertise: [], customExpertise: '', description: '' });
    alert('陪跑专家申请已提交，请等待管理员审核');
  };

  // 初始化合伙人数据
  React.useEffect(() => {
    const fetchPartnerStatus = async () => {
      if (!user?.id) return;
      
      try {
        // 从API获取申请状态
        const response = await fetch(`/api/partners?userId=${user.id}`);
        const data = await response.json();
        
        if (data.success && data.application) {
          const app = data.application;
          const newProfile = {
            isPartner: app.status === 'approved',
            status: app.status,
            level: app.level,
            region: app.region,
            businessPlan: app.business_plan,
            submittedAt: app.submitted_at
          };
          setPartnerProfile(newProfile);
          localStorage.setItem('user_partner_profile', JSON.stringify(newProfile));
        } else {
          // 如果API没有数据，检查本地存储
          const saved = localStorage.getItem('user_partner_profile');
          if (saved) {
            try {
              setPartnerProfile(JSON.parse(saved));
            } catch (e) {}
          }
        }
      } catch (error) {
        console.error('获取合伙人状态失败:', error);
        // 如果API调用失败，使用本地存储
        const saved = localStorage.getItem('user_partner_profile');
        if (saved) {
          try {
            setPartnerProfile(JSON.parse(saved));
          } catch (e) {}
        }
      }
    };
    
    fetchPartnerStatus();
    
    // 加载分享数据
    const savedDownline = localStorage.getItem('user_partner_downline');
    if (savedDownline) {
      try {
        setDownlineData(JSON.parse(savedDownline));
      } catch (e) {}
    }
  }, [user?.id]);

  // 组织活动统计
  const [orgStats, setOrgStats] = useState({ communities: 0, activities: 0, projects: 0 });

  // 合伙人分享数据
  const [downlineData, setDownlineData] = useState<{
    totalCount: number;
    users: Array<{
      id: string;
      name: string;
      avatar?: string;
      joinTime: string;
      source: string;
    }>;
  }>({ totalCount: 0, users: [] });

  const [showOverview, setShowOverview] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 提交合伙人申请
  const handleSubmitPartner = async () => {
    if (!partnerForm.level) {
      alert('请选择合伙人类型');
      return;
    }
    if (partnerForm.level === '城市合伙人' && !partnerForm.region) {
      alert('请填写意向城市');
      return;
    }
    if (!partnerForm.businessPlan) {
      alert('请填写商业计划');
      return;
    }

    setIsSubmittingPartner(true);
    
    try {
      const response = await fetch('/api/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          level: partnerForm.level,
          region: partnerForm.region,
          businessPlan: partnerForm.businessPlan
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newProfile = {
          isPartner: false,
          status: 'pending' as const,
          level: partnerForm.level,
          region: partnerForm.region,
          businessPlan: partnerForm.businessPlan,
          submittedAt: new Date().toISOString()
        };
        
        setPartnerProfile(newProfile);
        localStorage.setItem('user_partner_profile', JSON.stringify(newProfile));
        setShowPartnerModal(false);
        setPartnerForm({ level: '', region: '', businessPlan: '' });
        
        alert('合伙人申请已提交，请等待管理员审核');
      } else {
        alert(data.error || '提交失败，请重试');
      }
    } catch (error) {
      console.error('提交合伙人申请失败:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmittingPartner(false);
    }
  };

  // 撤回合伙人申请
  const handleWithdrawPartner = () => {
    if (confirm('确定要撤回合伙人申请吗？撤回后将删除您的申请记录。')) {
      setPartnerProfile(null);
      localStorage.removeItem('user_partner_profile');
    }
  };

  // 从后台设置获取合伙人类型
  const partnerLevels = adminCategories.partner_level?.map(c => c.name) || ['合伙人', '城市合伙人'];

  // 提交认证
  const handleVerify = async () => {
    if (!verifyForm.realName || !verifyForm.idNumber) {
      alert('请填写姓名和身份证号');
      return;
    }
    if (!verifyForm.facePhoto) {
      alert('请现场拍照');
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/auth/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: verifyForm.realName,
          idcard: verifyForm.idNumber,
          image: verifyForm.facePhoto,
          userId: user?.id
        })
      });
      const data = await res.json();

      if (data.success && data.data?.isMatch) {
        setPersonalVerified(true);
        // 持久化认证状态到 localStorage，防止刷新后丢失
        try {
          const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
          savedUser.identity_verified = true;
          localStorage.setItem('user', JSON.stringify(savedUser));
          revalidateSession();
        } catch {}
        setVerifyResult({ score: data.data.score, message: '✅ ' + data.data.message });
        setTimeout(() => setShowVerifyModal(false), 2000);
      } else {
        setVerifyResult({ score: data.data?.score, message: '❌ ' + (data.data?.message || data.error || '认证失败') });
      }
    } catch (e) {
      setVerifyResult({ message: '❌ 认证服务异常，请稍后重试' });
    } finally {
      setIsVerifying(false);
    }
  };

  // 打开认证弹窗
  const openVerifyModal = (type: 'personal') => {
    setVerifyType(type);
    setVerifyForm({ realName: '', idNumber: '', facePhoto: '' });
    setVerifyResult(null);
    setShowVerifyModal(true);
  };

  // 名片字段模板
  const fieldTemplates = {
    personal: [
      { key: 'title', label: '职位/头衔', placeholder: '如：创业者、项目经理' },
      { key: 'company', label: '公司/组织', placeholder: '公司名称' },
      { key: 'email', label: '邮箱', placeholder: '请输入邮箱地址' },
      { key: 'phone', label: '电话', placeholder: '手机号码' },
      { key: 'wechat', label: '微信', placeholder: '微信号' },
      { key: 'expertise', label: '专业领域', placeholder: '如：项目管理' },
      { key: 'cooperation', label: '合作意向', placeholder: '希望寻找合作机会...' },
      { key: 'bio', label: '个人简介', placeholder: '简要介绍自己...', isRichText: true }
    ],
    enterprise: [
      { key: 'industry', label: '所属行业', placeholder: '如：科技、金融' },
      { key: 'description', label: '企业简介', placeholder: '介绍企业主营业务...', isRichText: true },
      { key: 'email', label: '联系邮箱', placeholder: '请输入联系邮箱' },
      { key: 'address', label: '地址', placeholder: '公司地址' },
      { key: 'cooperation', label: '合作需求', placeholder: '寻找合作伙伴...' }
    ],
    expert: [
      { key: 'title', label: '职称/头衔', placeholder: '如：高级工程师、教授' },
      { key: 'field', label: '专业领域', placeholder: '如：人工智能、法律' },
      { key: 'experience', label: '从业经验', placeholder: '如：15年经验' },
      { key: 'education', label: '教育背景', placeholder: '如：清华大学 MBA' },
      { key: 'email', label: '邮箱', placeholder: 'expert@zhengdao.com' },
      { key: 'phone', label: '电话', placeholder: '联系电话' },
      { key: 'bio', label: '简介', placeholder: '详细介绍专业背景...', isRichText: true }
    ],
    coach: [
      { key: 'title', label: '职称/头衔', placeholder: '如：战略顾问、企业教练' },
      { key: 'field', label: '专业领域', placeholder: '如：战略规划、资源对接' },
      { key: 'experience', label: '从业经验', placeholder: '如：10年战略咨询经验' },
      { key: 'education', label: '教育背景', placeholder: '如：北京大学 EMBA' },
      { key: 'cases', label: '陪跑案例', placeholder: '列举服务过的企业案例' },
      { key: 'email', label: '邮箱', placeholder: 'coach@zhengdao.com' },
      { key: 'phone', label: '电话', placeholder: '联系电话' },
      { key: 'bio', label: '简介', placeholder: '详细介绍陪跑服务内容...', isRichText: true }
    ],
    partner: [
      { key: 'title', label: '合伙人类型', placeholder: '如：城市合伙人、项目合伙人' },
      { key: 'field', label: '合作领域', placeholder: '如：法律科技、教育培训' },
      { key: 'resources', label: '核心资源', placeholder: '如：政府关系、行业渠道' },
      { key: 'experience', label: '从业经验', placeholder: '如：10年行业经验' },
      { key: 'cooperation', label: '合作意向', placeholder: '希望寻找的合作伙伴...' },
      { key: 'email', label: '邮箱', placeholder: '联系邮箱' },
      { key: 'phone', label: '电话', placeholder: '联系电话' },
      { key: 'bio', label: '个人简介', placeholder: '介绍合伙人背景与愿景...', isRichText: true }
    ]
  };

  const handleOpenEdit = () => {
    setEditForm({
      display_name: profile?.display_name || '',
      real_name: profile?.real_name || '',
      company_name: profile?.company_name || '',
      phone: profile?.phone || '',
      email: profile?.email || ''
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    // 验证必填项
    if (!editForm.display_name.trim()) {
      alert('请填写昵称');
      return;
    }
    if (!editForm.real_name.trim()) {
      alert('请填写真实姓名');
      return;
    }
    
    setIsSaving(true);
    const result = await updateProfile({
      display_name: editForm.display_name.trim(),
      real_name: editForm.real_name.trim() || undefined,
      company_name: editForm.company_name.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      email: editForm.email.trim() || undefined
    });
    setIsSaving(false);
    
    if (result.success) {
      setShowEditModal(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    setIsUploadingAvatar(true);
    
    try {
      // 读取文件
      const reader = new FileReader();
      reader.onload = async event => {
        const imgUrl = event.target?.result as string;
        
        // 创建 Image 对象进行裁剪
        const img = new Image();
        img.onload = async () => {
          // 裁剪成正方形（取中心区域）
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          
          // 创建 canvas 进行裁剪
          const canvas = document.createElement('canvas');
          const outputSize = 200; // 输出尺寸
          canvas.width = outputSize;
          canvas.height = outputSize;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 绘制圆角方形裁剪后的图片
            ctx.beginPath();
            const radius = 20; // 圆角半径
            ctx.moveTo(radius, 0);
            ctx.lineTo(outputSize - radius, 0);
            ctx.quadraticCurveTo(outputSize, 0, outputSize, radius);
            ctx.lineTo(outputSize, outputSize - radius);
            ctx.quadraticCurveTo(outputSize, outputSize, outputSize - radius, outputSize);
            ctx.lineTo(radius, outputSize);
            ctx.quadraticCurveTo(0, outputSize, 0, outputSize - radius);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.clip();
            
            // 绘制裁剪后的图片
            ctx.drawImage(img, x, y, size, size, 0, 0, outputSize, outputSize);
          }
          
          // 转换为 base64
          const croppedAvatarUrl = canvas.toDataURL('image/png');
          
          // 保存到 localStorage
          const currentProfile = profile;
          if (currentProfile) {
            await updateProfile({ avatar_url: croppedAvatarUrl });
          }
          
          setIsUploadingAvatar(false);
        };
        
        img.onerror = () => {
          alert('图片处理失败，请重试');
          setIsUploadingAvatar(false);
        };
        
        img.src = imgUrl;
      };
      
      reader.onerror = () => {
        alert('上传失败，请重试');
        setIsUploadingAvatar(false);
      };
      
      reader.readAsDataURL(file);
    } catch {
      alert('上传失败，请重试');
      setIsUploadingAvatar(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white mb-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="头像" 
                  className="w-24 h-24 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-amber-400 rounded-2xl flex items-center justify-center">
                  <User className="w-12 h-12 text-blue-900" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-50 transition-colors cursor-pointer border-2 border-blue-500">
                {isUploadingAvatar ? (
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-blue-500" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">
                {profile?.display_name || profile?.real_name || '用户'}
              </h1>
              {profile?.real_name && profile?.display_name && profile?.real_name !== profile?.display_name && (
                <p className="text-blue-200 mt-0.5 text-sm">
                  姓名：{profile?.real_name}
                </p>
              )}
              <p className="text-blue-200 mt-1">
                {profile?.phone}
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
                {!!(user as any)?.identity_verified && (
                  <span className="px-3 py-1 bg-green-500/20 rounded-full text-sm flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    已认证
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowOverview(true)}
              className="px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-white/25 transition-all"
            >
              <Eye className="w-4 h-4" />
              资料概览
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="px-4 py-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-white/25 transition-all"
            >
              <FileText className="w-4 h-4" />
              对外展示
            </button>
          </div>
        </motion.div>

        {/* 申请通道 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  申请通道
                </h2>
                <p className="text-sm text-slate-500">开启你的平台之旅</p>
              </div>
            </div>
          </div>

          {/* AI 信任画像 */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-5 mb-6 border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />AI 信任画像
                </h3>
                <p className="text-xs text-indigo-500">综合分析活跃度与合作信用</p>
              </div>
              <button onClick={async () => {
                setScoreLoading(true);
                try {
                  const res = await fetch('/api/ai', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'analyze',
                      content: '请生成一份信任画像分析，基于以下维度评估：1）社区参与度 2）活动活跃度 3）合作诚信度 4）社交网络广度。给出一份综合信任评分和成长建议。',
                      prompt: '请以专业、鼓励的语气，为用户生成一份简洁的信任画像分析报告。包含综合评分（百分制）、各维度得分简述、以及2-3条可执行的提升建议。',
                      context: '这是一份社交信任平台的用户资料数据',
                    }),
                  });
                  const data = await res.json();
                  if (data.success) setTrustScore(data.result);
                } catch {} finally { setScoreLoading(false); }
              }} disabled={scoreLoading}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                {scoreLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {scoreLoading ? '分析中...' : '刷新信任画像'}
              </button>
            </div>
            {trustScore && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{trustScore}</div>
              </div>
            )}
            {!trustScore && !scoreLoading && (
              <p className="text-xs text-indigo-400 text-center py-3">点击上方按钮，AI 将综合你的平台数据生成信任画像</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 协调专家申请卡片 */}
            <div className={`p-5 rounded-xl border-2 transition-all ${
              mediatorProfile?.status === 'approved' 
                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                : mediatorProfile?.isMediator
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600'
            }`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">协调专家</h3>
                    {mediatorProfile?.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">已认证</span>
                    )}
                    {mediatorProfile?.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">审核中</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-3">参与平台协调工作，帮助解决纠纷</p>
                  
                  {mediatorProfile?.isMediator ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{mediatorProfile.type}</span>
                        {mediatorProfile.status === 'pending' && ' - 等待审核'}
                      </p>
                      {mediatorProfile.status === 'approved' && (
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{mediatorProfile.caseCount} 个案件</span>
                          <span>{mediatorProfile.successRate}% 成功率</span>
                        </div>
                      )}
                      {mediatorProfile.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setMediatorForm({
                                type: mediatorProfile.type,
                                expertise: mediatorProfile.expertise.filter(e => expertiseAreas.includes(e)),
                                customExpertise: mediatorProfile.expertise.find(e => !expertiseAreas.includes(e)) || '',
                                description: mediatorProfile.description
                              });
                              setShowMediatorModal(true);
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            修改申请
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要撤回申请吗？')) {
                                setMediatorProfile(null);
                                localStorage.removeItem('user_mediator_profile');
                              }
                            }}
                            className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            撤回
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowMediatorModal(true)}
                      className="w-full mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      申请成为协调专家
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 陪跑专家申请卡片 */}
            <div className={`p-5 rounded-xl border-2 transition-all ${
              coachProfile?.status === 'approved' 
                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                : coachProfile?.isCoach
                ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600'
            }`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">陪跑专家</h3>
                    {coachProfile?.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">已认证</span>
                    )}
                    {coachProfile?.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">审核中</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-3">为企业提供战略陪跑，对接战略资源</p>
                  
                  {coachProfile?.isCoach ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{coachProfile.type}</span>
                        {coachProfile.status === 'pending' && ' - 等待审核'}
                      </p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowCoachModal(true)}
                      className="w-full mt-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      申请成为陪跑专家
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 合伙人申请卡片 */}
            <div className={`p-5 rounded-xl border-2 transition-all ${
              partnerProfile?.status === 'approved' 
                ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20'
                : partnerProfile?.isPartner
                ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
            }`}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Handshake className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">合伙人</h3>
                    {partnerProfile?.status === 'approved' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">已认证</span>
                    )}
                    {partnerProfile?.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">审核中</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-3">与平台共同发展，共享商业价值</p>
                  
                  {partnerProfile?.isPartner || partnerProfile?.status === 'pending' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{partnerProfile.level}</span>
                        {partnerProfile.region && ` · ${partnerProfile.region}`}
                        {partnerProfile.status === 'pending' && ' - 等待审核'}
                      </p>
                      {partnerProfile.status === 'approved' && (
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>合伙人</span>
                        </div>
                      )}
                      {partnerProfile.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setPartnerForm({
                                level: partnerProfile.level,
                                region: partnerProfile.region,
                                businessPlan: partnerProfile.businessPlan
                              });
                              setShowPartnerModal(true);
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            修改申请
                          </button>
                          <button
                            onClick={handleWithdrawPartner}
                            className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            撤回
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowPartnerModal(true)}
                      className="w-full mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      申请成为合伙人
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 协调专区 - 仅已批准协调专家显示 */}
        {mediatorProfile?.status === 'approved' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Scale className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    协调专区
                  </h2>
                  <p className="text-sm text-slate-500">管理您的协调案件</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xl font-bold text-amber-600">{mediationCases.length}</div>
                  <div className="text-xs text-slate-500">总案件</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600">{mediationCases.filter(c => c.status === 'resolved' || c.status === 'archived').length}</div>
                  <div className="text-xs text-slate-500">已结束</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">{mediationCases.filter(c => c.status === 'ongoing').length}</div>
                  <div className="text-xs text-slate-500">调解中</div>
                </div>
              </div>
            </div>

            {/* 筛选标签 */}
            <div className="flex items-center gap-2 mb-4">
              {(['全部', '待调解', '调解中', '调解结束', '已存档'] as const).map(filter => {
                const count = filter === '全部' ? mediationCases.length : mediationCases.filter(c => c.status === ({
                  '待调解': 'pending', '调解中': 'ongoing', '调解结束': 'resolved', '已存档': 'archived'
                })[filter]).length;
                return (
                  <button key={filter} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === '全部' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-amber-50'
                  }`}>{filter} ({count})</button>
                );
              })}
            </div>

            {/* 案件列表 */}
            <div className="space-y-3">
              {mediationCases.length > 0 ? mediationCases.map(caseItem => (
                <div key={caseItem.id} className="border rounded-xl overflow-hidden">
                  <div
                    onClick={() => toggleExpand(caseItem.id)}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        caseItem.status === 'ongoing' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        caseItem.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        caseItem.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/30' :
                        caseItem.status === 'archived' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        'bg-slate-200 dark:bg-slate-600'
                      }`}>
                        <Scale className={`w-6 h-6 ${
                          caseItem.status === 'ongoing' ? 'text-blue-600' :
                          caseItem.status === 'pending' ? 'text-amber-600' :
                          caseItem.status === 'resolved' ? 'text-green-600' :
                          caseItem.status === 'archived' ? 'text-purple-600' : 'text-slate-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 dark:text-white">{caseItem.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            caseItem.status === 'ongoing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            caseItem.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            caseItem.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          }`}>
                            {{ pending:'待调解',ongoing:'调解中',resolved:'调解结束',archived:'已存档' }[caseItem.status]||caseItem.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">案件编号：{caseItem.caseNumber} · {caseItem.type} · 当事人：{caseItem.parties.join(' / ')}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>创建：{caseItem.createTime ? new Date(caseItem.createTime).toLocaleDateString() : ''}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${caseItem.expanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 展开详情 */}
                  {caseItem.expanded && (
                    <div className="p-4 bg-white dark:bg-slate-800 border-t">
                      {/* 申请详情 */}
                      <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-xs font-medium text-slate-500 mb-2">申请详情</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">申请方：{caseItem.applicant_name}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">被协调方：{caseItem.respondent_name}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">关联事项：{caseItem.relationship || '—'}</p>
                        {caseItem.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-white dark:bg-slate-600 rounded p-2">{caseItem.description}</p>
                        )}
                      </div>
                      {/* 对方反馈 */}
                      {caseItem.feedback && caseItem.feedback !== '' ? (
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                          <p className="text-xs font-medium text-amber-600 mb-1">对方反馈</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{caseItem.feedback}</p>
                        </div>
                      ) : (
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-xs text-slate-400">暂无对方反馈</div>
                      )}
                      {/* 协调专家评论 */}
                      {(caseItem.comments || []).map(c => (
                        <div key={c.id} className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded">
                          <div className="flex justify-between mb-1"><span className="text-xs font-medium text-blue-600">{c.author}</span><span className="text-xs text-slate-400">{c.time}</span></div>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{c.content}</p>
                        </div>
                      ))}
                      {/* 发表意见 */}
                      <div className="flex gap-2 mt-3">
                        <input type="text" value={commentInput[caseItem.id]||''}
                          onChange={e => setCommentInput({ ...commentInput, [caseItem.id]: e.target.value })}
                          placeholder="发表协调意见或询问..."
                          onKeyDown={e => { if (e.key === 'Enter') {
                            const c = commentInput[caseItem.id]?.trim();
                            if (!c) return;
                            const now = new Date();
                            const updated = mediationCases.map(x => x.id===caseItem.id ? { ...x, comments: [...(x.comments||[]), { id: Date.now().toString(), author: '协调专家', content: c, time: now.toLocaleString() }] } : x);
                            setMediationCases(updated);
                            setCommentInput({ ...commentInput, [caseItem.id]: '' });
                          }}}
                          className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                        />
                        <button onClick={() => {
                          const c = commentInput[caseItem.id]?.trim();
                          if (!c) return;
                          const now = new Date();
                          const updated = mediationCases.map(x => x.id===caseItem.id ? { ...x, comments: [...(x.comments||[]), { id: Date.now().toString(), author: '协调专家', content: c, time: now.toLocaleString() }] } : x);
                          setMediationCases(updated);
                          setCommentInput({ ...commentInput, [caseItem.id]: '' });
                        }} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm">发表</button>
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-8">
                  <Scale className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">暂无协调案件</p>
                  <p className="text-sm text-slate-400">系统将自动为您分配案件</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 合伙人业务概览 - 仅已批准显示 */}
        {partnerProfile?.status === 'approved' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    组织活动统计
                  </h2>
                  <p className="text-sm text-slate-500">统计您创建或参与的组织活动</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium">
                {partnerProfile.level}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{orgStats.communities}</p>
                <p className="text-xs text-slate-500 mt-1">创建的共同体</p>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{orgStats.activities}</p>
                <p className="text-xs text-slate-500 mt-1">创建的活动</p>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{orgStats.projects}</p>
                <p className="text-xs text-slate-500 mt-1">创建的项目</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 二维码弹窗 */}
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
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    编辑资料
                  </h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* 头像预览 */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="头像" 
                        className="w-24 h-24 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-amber-400 rounded-2xl flex items-center justify-center">
                        <User className="w-12 h-12 text-blue-900" />
                      </div>
                    )}
                    <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors cursor-pointer">
                      {isUploadingAvatar ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  </div>
                </div>

                {/* 昵称 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    昵称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={e => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="设置您的昵称"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 真实姓名 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    真实姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.real_name}
                    onChange={e => setEditForm(prev => ({ ...prev, real_name: e.target.value }))}
                    placeholder="输入您的真实姓名"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">真实姓名用于对外展示，请如实填写</p>
                </div>

                {/* 企业名称（仅企业用户显示） */}
                {profile?.user_type === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      企业名称
                    </label>
                    <input
                      type="text"
                      value={editForm.company_name}
                      onChange={e => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="输入企业名称"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* 手机号 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    手机号
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="输入手机号"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 邮箱 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="输入邮箱"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !editForm.display_name.trim() || !editForm.real_name.trim()}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl text-white transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      保存修改
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 创建名片弹窗 */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    创建名片
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                {/* 名片类型选择 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    选择名片类型
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { type: 'personal' as const, icon: UserCircle, label: '个人名片', color: 'bg-green-500', borderColor: 'border-green-500' },
                      { type: 'expert' as const, icon: Award, label: '专家名片', color: 'bg-purple-500', borderColor: 'border-purple-500' },
                      { type: 'partner' as const, icon: Handshake, label: '合伙人名片', color: 'bg-teal-500', borderColor: 'border-teal-500' }
                    ].map(({ type, icon: TypeIcon, label, color, borderColor }) => (
                      <button
                        key={type}
                        onClick={() => {
                          setCreateForm({
                            type,
                            fields: {},
                            phoneNumbers: profile?.phone ? [profile.phone] : [],
                            isPublic: true
                          });
                        }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          createForm.type === type || (type === 'expert' && (createForm.type === 'expert' || createForm.type === 'coach'))
                            ? `${borderColor} bg-opacity-10`
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 专家子类型选择 */}
                {createForm.type === 'expert' && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">专家类型</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateForm({ ...createForm, type: 'expert' })}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${createForm.type === 'expert' ? 'bg-purple-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}
                      >
                        协调专家
                      </button>
                      <button
                        onClick={() => setCreateForm({ ...createForm, type: 'coach' })}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${(createForm.type as string) === 'coach' ? 'bg-teal-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}
                      >
                        陪跑专家
                      </button>
                    </div>
                  </div>
                )}

                {/* 姓名提示 */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    姓名将自动显示为：{profile?.real_name || profile?.display_name || '未设置'}
                  </span>
                </div>
                
                {/* 字段表单 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    填写名片信息
                  </h3>
                  {fieldTemplates[createForm.type].map(field => (
                    <div key={field.key}>
                      <label className="block text-xs text-slate-500 mb-1">
                        {field.label}
                      </label>
                      {field.key === 'wechat' ? (
                        <div className="flex items-center gap-4">
                          <input
                            type="text"
                            value={createForm.fields[field.key] || ''}
                            onChange={e => setCreateForm(prev => ({
                              ...prev,
                              fields: { ...prev.fields, [field.key]: e.target.value }
                            }))}
                            placeholder={field.placeholder}
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                          />
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={createForm.fields[field.key] === (profile?.phone || createForm.fields.phone)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setCreateForm(prev => ({
                                    ...prev,
                                    fields: { ...prev.fields, [field.key]: prev.fields.phone || profile?.phone || '' }
                                  }));
                                } else {
                                  setCreateForm(prev => ({
                                    ...prev,
                                    fields: { ...prev.fields, [field.key]: '' }
                                  }));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            同手机号
                          </label>
                        </div>
                      ) : field.key === 'bio' || field.key === 'description' || field.isRichText ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                            <span className={`px-2 py-0.5 rounded ${field.key === 'description' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                              {field.key === 'description' ? '企业简介' : field.label}
                            </span>
                            <span>{field.key === 'description' ? '展示企业实力和主营业务' : createForm.type === 'expert' ? '展示专业能力和学术成就' : createForm.type === 'partner' ? '展示合伙人资源与愿景' : '详细描述能让伙伴更好地了解你'}</span>
                          </div>
                          <div className="border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                            <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(`bio-editor-${createForm.type}`) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const newText = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
                                    setCreateForm(prev => ({ ...prev, fields: { ...prev.fields, [field.key]: newText } }));
                                    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 2, end + 2); }, 0);
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 font-bold text-sm"
                                title="加粗"
                              >B</button>
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(`bio-editor-${createForm.type}`) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const newText = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
                                    setCreateForm(prev => ({ ...prev, fields: { ...prev.fields, [field.key]: newText } }));
                                    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 1, end + 1); }, 0);
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 italic text-sm"
                                title="斜体"
                              >I</button>
                              <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></span>
                              <button
                                type="button"
                                onClick={() => {
                                  const textarea = document.getElementById(`bio-editor-${createForm.type}`) as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const text = textarea.value;
                                    const newText = text.substring(0, start) + '\n• ' + text.substring(start);
                                    setCreateForm(prev => ({ ...prev, fields: { ...prev.fields, [field.key]: newText } }));
                                    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 3, start + 3); }, 0);
                                  }
                                }}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm"
                                title="项目符号"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                              </button>
                              <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></span>
                              <button
                                type="button"
                                onClick={() => handleInsertImage(field.key)}
                                disabled={uploadingImage}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm disabled:opacity-50"
                                title="插入图片"
                              >
                                {uploadingImage ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <ImageIcon className="w-4 h-4" />
                                )}
                              </button>
                              {/* 隐藏的图片上传 input */}
                              <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handleImageUpload(e, field.key)}
                              />
                              <div className="flex-1" />
                              <AIWriter
                                onResult={(text) => setCreateForm(prev => ({ ...prev, fields: { ...prev.fields, [field.key]: text } }))}
                                prompt={`请为${createForm.type}类型的名片撰写专业的简介，要求语言精炼、真实可信，内容包含${field.key === 'description' ? '企业主营业务、核心优势和行业影响力' : '个人专业背景、核心专长和价值主张'}。`}
                                context={`用户已填写内容：${createForm.fields[field.key] || '无'}`}
                                label="AI 写简介"
                              />
                            </div>
                            <textarea
                              id={`bio-editor-${createForm.type}`}
                              value={createForm.fields[field.key] || ''}
                              onChange={e => setCreateForm(prev => ({
                                ...prev,
                                fields: { ...prev.fields, [field.key]: e.target.value }
                              }))}
                              placeholder={field.key === 'description' ? '介绍企业主营业务、核心优势、团队实力、发展愿景...' : '介绍一下你自己：背景、技能、价值观、想寻找的合作机会...'}
                              rows={6}
                              className="w-full px-4 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={createForm.fields[field.key] || ''}
                          onChange={e => setCreateForm(prev => ({
                            ...prev,
                            fields: { ...prev.fields, [field.key]: e.target.value }
                          }))}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                      )}
                    </div>
                  ))}

                  {/* 多手机号输入 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      手机号码（可添加多个）
                    </label>
                    <div className="space-y-2">
                      {createForm.phoneNumbers.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={phone}
                            onChange={e => setCreateForm(prev => ({
                              ...prev,
                              phoneNumbers: prev.phoneNumbers.map((p, i) => i === idx ? e.target.value : p)
                            }))}
                            placeholder="请输入手机号码"
                            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                          />
                          <button
                            onClick={() => setCreateForm(prev => ({
                              ...prev,
                              phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== idx)
                            }))}
                            className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setCreateForm(prev => ({
                          ...prev,
                          phoneNumbers: [...prev.phoneNumbers, '']
                        }))}
                        className="flex items-center gap-2 w-full py-2.5 px-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        添加手机号码
                      </button>
                    </div>
                    {createForm.phoneNumbers.length === 0 && profile?.phone && (
                      <p className="text-xs text-slate-400 mt-1">
                        已从您的资料中提取手机号，可点击上方按钮添加更多
                      </p>
                    )}
                  </div>

                  {/* 可见性设置 */}
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCreateForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                        createForm.isPublic
                          ? 'bg-amber-500 text-white'
                          : 'border-2 border-slate-300 dark:border-slate-500'
                      }`}
                    >
                      {createForm.isPublic && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">发现广场可见</p>
                      <p className="text-xs text-slate-400">勾选后，名片将在发现伙伴页展示给其他用户</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (!user?.id) {
                      alert('请先登录');
                      return;
                    }

                    try {
                      const fields = Object.entries(createForm.fields).map(([key, value]) => ({
                        key,
                        label: fieldTemplates[createForm.type].find(f => f.key === key)?.label || key,
                        value,
                        type: 'text' as const
                      }));

                      const response = await fetch('/api/profiles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user.id,
                          type: createForm.type,
                          fields,
                          phoneNumbers: createForm.phoneNumbers,
                          isDefault: publicProfiles.length === 0,
                          isPublic: createForm.isPublic
                        })
                      });

                      const data = await response.json();

                      if (data.success) {
                        setPublicProfiles(prev => [data.profile, ...prev]);
                        setShowCreateModal(false);
                        setCreateForm({ type: 'personal', fields: {}, phoneNumbers: [], isPublic: true });
                      } else {
                        alert(data.error || '创建名片失败');
                      }
                    } catch (error) {
                      console.error('创建名片失败:', error);
                      alert('创建名片失败，请重试');
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 rounded-xl text-white transition-colors font-medium"
                >
                  创建名片
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 编辑名片弹窗 */}
      <AnimatePresence>
        {showCardEditModal && editingCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCardEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">编辑名片</h2>
                <button
                  onClick={() => setShowCardEditModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                {/* 名片类型显示（不可修改） */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    名片类型
                  </label>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl ${
                    editingCard.type === 'personal' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' :
                    editingCard.type === 'enterprise' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' :
                    editingCard.type === 'expert' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                    editingCard.type === 'partner' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {editingCard.type === 'personal' ? <User className="w-5 h-5" /> :
                     editingCard.type === 'enterprise' ? <Building className="w-5 h-5" /> :
                     editingCard.type === 'expert' ? <Award className="w-5 h-5" /> :
                     editingCard.type === 'partner' ? <Handshake className="w-5 h-5" /> :
                     <User className="w-5 h-5" />}
                    <span className="text-sm font-medium">{
                      editingCard.type === 'personal' ? '个人' :
                      editingCard.type === 'enterprise' ? '企业' :
                      editingCard.type === 'expert' ? '专家' :
                      editingCard.type === 'partner' ? '合伙人' :
                      editingCard.type
                    }名片</span>
                  </div>
                </div>

                {/* 字段编辑 */}
                {(fieldTemplates[editingCard.type] || []).map((field: any) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {field.label}
                    </label>
                    {field.isRichText ? (
                      <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
                          <button
                            onClick={() => handleInsertImage(field.key)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            title="插入图片"
                          >
                            {uploadingImage ? (
                              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                            ) : (
                              <ImageIcon className="w-4 h-4" />
                            )}
                          </button>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleImageUpload(e, field.key)}
                          />
                        </div>
                        <textarea
                          id={`edit-bio-editor-${editingCard.type}`}
                          value={editingCard.fields[field.key] || ''}
                          onChange={e => setEditingCard(prev => prev ? ({
                            ...prev,
                            fields: { ...prev.fields, [field.key]: e.target.value }
                          }) : null)}
                          placeholder={field.placeholder}
                          rows={6}
                          className="w-full px-4 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none text-sm"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={editingCard.fields[field.key] || ''}
                        onChange={e => setEditingCard(prev => prev ? ({
                          ...prev,
                          fields: { ...prev.fields, [field.key]: e.target.value }
                        }) : null)}
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                    )}
                  </div>
                ))}

                {/* 多手机号输入 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    手机号码（可添加多个）
                  </label>
                  <div className="space-y-2">
                    {editingCard.phoneNumbers.map((phone, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setEditingCard(prev => prev ? ({
                            ...prev,
                            phoneNumbers: prev.phoneNumbers.map((p, i) => i === idx ? e.target.value : p)
                          }) : null)}
                          placeholder="请输入手机号码"
                          className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                        <button
                          onClick={() => setEditingCard(prev => prev ? ({
                            ...prev,
                            phoneNumbers: prev.phoneNumbers.filter((_, i) => i !== idx)
                          }) : null)}
                          className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setEditingCard(prev => prev ? ({
                        ...prev,
                        phoneNumbers: [...prev.phoneNumbers, '']
                      }) : null)}
                      className="flex items-center gap-2 w-full py-2.5 px-4 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      添加手机号码
                    </button>
                  </div>
                </div>

                {/* 可见性设置 */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEditingCard(prev => prev ? ({ ...prev, isPublic: !prev.isPublic }) : null)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                      editingCard.isPublic
                        ? 'bg-amber-500 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-500'
                    }`}
                  >
                    {editingCard.isPublic && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">发现广场可见</p>
                    <p className="text-xs text-slate-400">勾选后，名片将在发现伙伴页展示给其他用户</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => setShowCardEditModal(false)}
                  className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (!user?.id) return;
                    try {
                      const fields = Object.entries(editingCard.fields).map(([key, value]) => ({
                        key,
                        label: (fieldTemplates[editingCard.type] || []).find((f: any) => f.key === key)?.label || key,
                        value,
                        type: 'text'
                      }));

                      const response = await fetch(`/api/profiles/${editingCard.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: editingCard.type,
                          fields,
                          phoneNumbers: editingCard.phoneNumbers,
                          isPublic: editingCard.isPublic
                        })
                      });

                      const data = await response.json();
                      if (data.success) {
                        // 刷新名片列表
                        const profilesRes = await fetch(`/api/profiles?userId=${user.id}`);
                        const profilesData = await profilesRes.json();
                        if (profilesData.success) {
                          setPublicProfiles(profilesData.profiles || []);
                        }
                        setShowCardEditModal(false);
                        setEditingCard(null);
                      } else {
                        alert(data.error || '更新名片失败');
                      }
                    } catch (error) {
                      console.error('更新名片失败:', error);
                      alert('更新名片失败，请重试');
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 rounded-xl text-white transition-colors font-medium"
                >
                  保存修改
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 协调专家申请弹窗 */}
      <AnimatePresence>
        {showMediatorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowMediatorModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {mediatorProfile?.status === 'pending' ? '修改协调专家申请' : '申请成为协调专家'}
                  </h2>
                </div>
                <button 
                  onClick={() => setShowMediatorModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">成为协调专家后，您可以参与平台协调工作，帮助解决纠纷，提升个人信誉。</p>

                {/* 协调专家类型 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    协调专家类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mediatorForm.type}
                    onChange={e => setMediatorForm({ ...mediatorForm, type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="">请选择协调专家类型</option>
                    {expertTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* 擅长领域 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    擅长领域
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {/* 已添加的自定义领域标签 */}
                    {mediatorForm.expertise.filter(e => !expertiseAreas.includes(e)).map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-sm">
                        {skill}
                        <button type="button" onClick={() => setMediatorForm({ ...mediatorForm, expertise: mediatorForm.expertise.filter(e => e !== skill) })} className="ml-1 hover:text-red-500">&times;</button>
                      </span>
                    ))}
                    {expertiseAreas.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const newExpertise = mediatorForm.expertise.includes(skill)
                            ? mediatorForm.expertise.filter(e => e !== skill)
                            : [...mediatorForm.expertise, skill];
                          setMediatorForm({ ...mediatorForm, expertise: newExpertise });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          mediatorForm.expertise.includes(skill)
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                    {/* 自定义擅长领域输入 */}
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="text"
                        value={mediatorForm.customExpertise}
                        onChange={e => setMediatorForm({ ...mediatorForm, customExpertise: e.target.value })}
                        placeholder="输入擅长领域名称，可添加多个"
                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && mediatorForm.customExpertise.trim()) {
                            e.preventDefault();
                            if (!mediatorForm.expertise.includes(mediatorForm.customExpertise.trim())) {
                              setMediatorForm({ ...mediatorForm, expertise: [...mediatorForm.expertise, mediatorForm.customExpertise.trim()], customExpertise: '' });
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!mediatorForm.customExpertise.trim()) return;
                          if (!mediatorForm.expertise.includes(mediatorForm.customExpertise.trim())) {
                            setMediatorForm({ ...mediatorForm, expertise: [...mediatorForm.expertise, mediatorForm.customExpertise.trim()], customExpertise: '' });
                          }
                        }}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 flex-shrink-0"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>

                {/* 个人简介 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    个人简介 <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('mediator-bio-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const newText = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
                            setMediatorForm({ ...mediatorForm, description: newText });
                            setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 2, end + 2); }, 0);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 font-bold text-sm"
                        title="加粗"
                      >B</button>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('mediator-bio-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const newText = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
                            setMediatorForm({ ...mediatorForm, description: newText });
                            setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 1, end + 1); }, 0);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 italic text-sm"
                        title="斜体"
                      >I</button>
                      <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></span>
                      <button
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('mediator-bio-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const text = textarea.value;
                            const newText = text.substring(0, start) + '\n• ' + text.substring(start);
                            setMediatorForm({ ...mediatorForm, description: newText });
                            setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 3, start + 3); }, 0);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm"
                        title="项目符号"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      </button>
                      <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></span>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('mediator-image-upload') as HTMLInputElement;
                          input?.click();
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm"
                        title="插入图片"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input
                        id="mediator-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            alert('图片大小不能超过 5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = event => {
                            const base64Image = event.target?.result as string;
                            const imageMarkdown = `\n![图片](${base64Image})\n`;
                            const textarea = document.getElementById('mediator-bio-editor') as HTMLTextAreaElement;
                            if (textarea) {
                              const start = textarea.selectionStart;
                              const text = textarea.value;
                              const newText = text.substring(0, start) + imageMarkdown + text.substring(start);
                              setMediatorForm({ ...mediatorForm, description: newText });
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <textarea
                      id="mediator-bio-editor"
                      value={mediatorForm.description}
                      onChange={e => setMediatorForm({ ...mediatorForm, description: e.target.value })}
                      placeholder="请介绍一下您的专业背景和协调经验..."
                      rows={4}
                      className="w-full px-4 py-2.5 bg-transparent text-slate-900 dark:text-white resize-none focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {mediatorProfile?.status === 'pending' 
                      ? '修改申请后，管理员将重新审核您的申请。'
                      : '提交申请后，管理员将在1-3个工作日内审核。审核通过后，您将正式成为协调专家。'
                    }
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button 
                  onClick={() => setShowMediatorModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSubmitMediator}
                  disabled={isSubmittingMediator || !mediatorForm.type}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmittingMediator && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mediatorProfile?.status === 'pending' ? '保存修改' : '提交申请'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 合伙人申请弹窗 */}
      <AnimatePresence>
        {showPartnerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowPartnerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Handshake className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {partnerProfile?.status === 'pending' ? '修改合伙人申请' : '申请成为合伙人'}
                  </h2>
                </div>
                <button 
                  onClick={() => setShowPartnerModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    成为合伙人后，您将与平台共同发展，共享商业价值。合伙人将获得分红权、参与决策等权益。
                  </p>
                </div>

                {/* 合伙人类型 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    合伙人类型 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {partnerLevels.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setPartnerForm({ ...partnerForm, level, region: level === '城市合伙人' ? partnerForm.region : '' })}
                        className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                          partnerForm.level === level
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 意向城市 - 仅城市合伙人显示 */}
                {partnerForm.level === '城市合伙人' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      意向城市 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={partnerForm.region}
                      onChange={e => setPartnerForm({ ...partnerForm, region: e.target.value })}
                      placeholder="请输入您希望负责的城市（地级市）"
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                {/* 商业计划 */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    商业计划 <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50">
                      <button 
                        type="button" 
                        onClick={() => {
                          const textarea = document.getElementById('partner-plan-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const newText = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
                            setPartnerForm({ ...partnerForm, businessPlan: newText });
                            setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 2, end + 2); }, 0);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 font-bold text-sm"
                        title="加粗"
                      >B</button>
                      <button 
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('partner-plan-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const end = textarea.selectionEnd;
                            const text = textarea.value;
                            const newText = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
                            setPartnerForm({ ...partnerForm, businessPlan: newText });
                            setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 1, end + 1); }, 0);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 italic text-sm"
                        title="斜体"
                      >I</button>
                      <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></span>
                      <button 
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('partner-plan-editor') as HTMLTextAreaElement;
                          if (textarea) {
                            const start = textarea.selectionStart;
                            const text = textarea.value;
                            const newText = text.substring(0, start) + '\n• ' + text.substring(start);
                            setPartnerForm({ ...partnerForm, businessPlan: newText });
                            setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + 3, start + 3); }, 0);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm"
                        title="项目符号"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      </button>
                      <span className="w-px h-4 bg-slate-200 dark:bg-slate-600 mx-1"></span>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('partner-image-upload') as HTMLInputElement;
                          input?.click();
                        }}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm"
                        title="插入图片"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <input
                        id="partner-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            alert('图片大小不能超过 5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = event => {
                            const base64Image = event.target?.result as string;
                            const imageMarkdown = `\n![图片](${base64Image})\n`;
                            const textarea = document.getElementById('partner-plan-editor') as HTMLTextAreaElement;
                            if (textarea) {
                              const start = textarea.selectionStart;
                              const text = textarea.value;
                              const newText = text.substring(0, start) + imageMarkdown + text.substring(start);
                              setPartnerForm({ ...partnerForm, businessPlan: newText });
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <textarea
                      id="partner-plan-editor"
                      value={partnerForm.businessPlan}
                      onChange={e => setPartnerForm({ ...partnerForm, businessPlan: e.target.value })}
                      placeholder="请详细描述您的商业计划：&#10;1. 个人/团队背景介绍&#10;2. 市场分析与目标定位&#10;3. 发展策略与实施计划&#10;4. 预期成果与贡献"
                      rows={8}
                      className="w-full px-4 py-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 resize-none focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {partnerProfile?.status === 'pending' 
                      ? '修改申请后，管理员将重新审核您的申请。'
                      : '提交申请后，管理员将在3-7个工作日内审核。请确保填写的信息真实有效。'
                    }
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button 
                  onClick={() => setShowPartnerModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSubmitPartner}
                  disabled={isSubmittingPartner || !partnerForm.level || (partnerForm.level === '城市合伙人' && !partnerForm.region) || !partnerForm.businessPlan}
                  className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isSubmittingPartner && <Loader2 className="w-4 h-4 animate-spin" />}
                  {partnerProfile?.status === 'pending' ? '保存修改' : '提交申请'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 陪跑专家申请弹窗 */}
      <AnimatePresence>
        {showCoachModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowCoachModal(false)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">申请成为陪跑专家</h2>
                <button onClick={() => setShowCoachModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">为企业提供战略陪跑，对接战略资源。请填写您的专业领域和从业经历。</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">简介及擅长领域 <span className="text-red-500">*</span></label>
                  <textarea value={coachForm.description} onChange={e => setCoachForm({ ...coachForm, description: e.target.value })} rows={5}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none text-sm"
                    placeholder="请描述您的专业背景、擅长领域和陪跑经验..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => setShowCoachModal(false)} className="px-6 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">取消</button>
                <button onClick={handleSubmitCoach} disabled={isSubmittingMediator} className="px-6 py-2.5 text-sm bg-teal-500 hover:bg-teal-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2">
                  {isSubmittingMediator && <Loader2 className="w-4 h-4 animate-spin" />}提交申请
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 身份认证弹窗 */}
      <AnimatePresence>
        {showVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowVerifyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    个人身份认证
                  </h2>
                </div>
                <button 
                  onClick={() => setShowVerifyModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-500">输入姓名和身份证号，并拍摄人脸照片进行公安库比对</p>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        真实姓名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={verifyForm.realName}
                        onChange={e => setVerifyForm({ ...verifyForm, realName: e.target.value })}
                        placeholder="请输入证件上的真实姓名"
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        身份证号 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={verifyForm.idNumber}
                        onChange={e => setVerifyForm({ ...verifyForm, idNumber: e.target.value })}
                        placeholder="请输入18位身份证号码"
                        maxLength={18}
                        className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        现场人脸拍照 <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-amber-600 mb-2">⚠️ 必须现场拍照，禁止上传已有照片！请确保五官清晰可见，正脸面对镜头</p>
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-amber-400 transition-colors cursor-pointer"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/jpeg,image/png';
                          input.capture = 'user'; // 强制调用前置摄像头（移动端）
                          input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            // 检查大小 < 5MB
                            if (file.size > 5 * 1024 * 1024) { alert('图片大小不能超过5MB'); return; }
                            const reader = new FileReader();
                            reader.onload = ev => {
                              const base64 = (ev.target?.result as string).split(',')[1];
                              setVerifyForm({ ...verifyForm, facePhoto: base64 || '' });
                            };
                            reader.readAsDataURL(file);
                          };
                          input.click();
                        }}
                      >
                        {verifyForm.facePhoto ? (
                          <div className="text-green-600">
                            <img src={`data:image/jpeg;base64,${verifyForm.facePhoto}`} alt="人脸照片" className="w-24 h-24 object-cover rounded-lg mx-auto mb-2" />
                            <p className="text-sm">已拍照</p>
                            <p className="text-xs text-slate-400 mt-1">点击重新拍摄</p>
                          </div>
                        ) : (
                          <>
                            <svg className="w-10 h-10 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                            </svg>
                            <p className="text-sm text-slate-500">点击打开摄像头拍照</p>
                            <p className="text-xs text-slate-400 mt-1">必须现场拍照，禁止上传照片</p>
                          </>
                        )}
                      </div>
                    </div>

                {verifyResult && (
                  <div className={`p-4 rounded-xl ${verifyResult.score !== undefined && verifyResult.score >= 0.45 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className={`text-sm ${verifyResult.score !== undefined && verifyResult.score >= 0.45 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      {verifyResult.message}
                    </p>
                    {verifyResult.score !== undefined && (
                      <p className="text-xs text-slate-500 mt-1">匹配度：{Math.round(verifyResult.score * 100)}%</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button 
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                  提交认证
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 资料概览弹窗 */}
      <AnimatePresence>
        {showOverview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowOverview(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">资料概览</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowOverview(false); handleOpenEdit(); }} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"><Edit className="w-4 h-4" />编辑</button>
                  {(publicProfiles.length > 0) ? (
                    <button onClick={() => { setShowOverview(false); setShowProfileModal(true); }} className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700">名片管理</button>
                  ) : (
                    <button onClick={() => { setShowOverview(false); setShowCardEditModal(true); }} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm">创建名片</button>
                  )}
                  <button onClick={() => setShowOverview(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">用户ID</span>
                  <span className="text-slate-900 dark:text-white text-sm font-mono">{profile?.id || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">{t('auth.register.name')}</span>
                  <span className="text-slate-900 dark:text-white">{profile?.real_name || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">昵称</span>
                  <span className="text-slate-900 dark:text-white">{profile?.display_name || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">手机号</span>
                  <span className="text-slate-900 dark:text-white">{profile?.phone || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">邮箱</span>
                  <span className="text-slate-900 dark:text-white">{profile?.email || '-'}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">身份认证</span>
                  {personalVerified ? (
                    <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> 已认证</span>
                  ) : (
                    <button onClick={() => { setShowOverview(false); openVerifyModal('personal'); }} className="text-sm text-amber-500 hover:text-amber-600">去认证</button>
                  )}
                </div>
                {partnerProfile?.status === 'approved' && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">合伙人类型</span>
                    <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium">{partnerProfile.level}</span>
                  </div>
                )}
                {mediatorProfile?.status === 'approved' && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">协调专家</span>
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm">{mediatorProfile.type}</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 对外展示弹窗 */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfileModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">我的对外展示</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowProfileModal(false); setShowCreateModal(true); }} className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm">创建名片</button>
                  <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-6">
                {publicProfiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {publicProfiles.map(profile => {
                      const typeConfig: any = { personal: { icon: UserCircle, color: 'bg-green-100 text-green-600', label: '个人' }, enterprise: { icon: Building, color: 'bg-blue-100 text-blue-600', label: '企业' }, expert: { icon: Award, color: 'bg-purple-100 text-purple-600', label: '专家' }, partner: { icon: Handshake, color: 'bg-teal-100 text-teal-600', label: '合伙人' } }[profile.type] || { icon: UserCircle, color: 'bg-green-100 text-green-600', label: profile.type };
                      const Icon = typeConfig.icon;
                      return (
                        <div key={profile.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConfig.color}`}><Icon className="w-5 h-5" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 dark:text-white truncate">{profile.fields?.find((f:any) => f.key === 'title')?.value || '名片'}</p>
                              <span className={`text-xs ${typeConfig.color}`}>{typeConfig.label}</span>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => { const f: any = {}; (profile.fields||[]).forEach((ff: any) => { f[ff.key] = ff.value || ''; }); setEditingCard({ id: profile.id, type: profile.type as any, fields: f, phoneNumbers: (profile.phoneNumbers||[]).filter((p:string)=>p), isPublic: profile.isPublic }); setShowProfileModal(false); setShowCardEditModal(true); }} className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg"><Edit className="w-4 h-4" /></button>
                              <button onClick={async () => { if(!confirm('确定删除？')) return; try { const r=await fetch('/api/profiles/'+profile.id,{ method:'DELETE' });if((await r.json()).success) setPublicProfiles(prev=>prev.filter(p=>p.id!==profile.id)); } catch {} }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          {(() => {
                            const bioField = profile.fields?.find((f: any) => f.key === 'bio' || f.key === 'description');
                            const bioText = bioField?.value || '';
                            return bioText ? (
                              <div className="mb-3">
                                <AISummary content={bioText} />
                              </div>
                            ) : null;
                          })()}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">分享码: {profile.shareCode}</span>
                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/share/${profile.shareCode}`); }} className="text-xs text-amber-500 flex items-center gap-1"><Share2 className="w-3 h-3" />分享</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 mb-4">您还没有创建对外展示名片</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
