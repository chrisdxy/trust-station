"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Key, Search, X, Loader2, Plus,
  Calendar, Shield, Clock, CheckCircle, Eye, EyeOff, Trash2, Pencil,
  Users, MessageSquare, AlertCircle, Scale, ChevronDown, Check, Copy
} from 'lucide-react';
import Layout from '@/components/Layout';
import RichTextEditor from '@/components/RichTextEditor';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// 会话过期时间（ms）
const SESSION_SHORT = 30 * 60 * 1000; // 30分钟
const SESSION_LONG = 7 * 24 * 60 * 60 * 1000; // 7天

interface Record {
  id: string;
  title: string;
  record_type: string;
  visibility: string;
  relationship_id?: string;
  related_id?: string;
  related_title?: string;
  related_type?: string; // 关联类型
  content?: string;
  created_at?: string;
  tags?: string;
  related_items?: any[]; // JSON 关联事项列表
  related_parties?: any[]; // JSON 有关方列表
  // 可看记录额外字段
  authorization_id?: string;
  grantor_id?: string;
  grantor_name?: string;
  grantor_real_name?: string;
  scope?: string;
  auth_description?: string;
}

interface Authorization {
  id: number | string;
  user_id: string;
  grantor_display_name?: string;
  grantor_real_name?: string;
  grantee_id?: string;
  grantee_email?: string;
  grantee_name: string;
  scope: string;
  status: string;
  description?: string;
  expiry_date?: string;
  created_at?: string;
  authorized_record_id?: string;
}

type TabType = 'records' | 'authorizations' | 'accessible' | 'public';

export default function ArchivesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('records');
  const [records, setRecords] = useState<Record[]>([]);
  const [authorizations, setAuthorizations] = useState<Authorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 弹窗状态
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showAddAuthorizationModal, setShowAddAuthorizationModal] = useState(false);
  const [savingRecord, setSavingRecord] = useState(false);

  // 编辑授权弹窗
  const [showEditAuthModal, setShowEditAuthModal] = useState(false);
  const [editingAuth, setEditingAuth] = useState<Authorization | null>(null);
  const [viewOnlyAuth, setViewOnlyAuth] = useState(false); // 查看模式（只读）
  const [editAuthForm, setEditAuthForm] = useState({
    description: '',
    expiry_date: '',
    scope: [] as string[],
    status: 'active' as string
  });
  const [savingAuth, setSavingAuth] = useState(false);

  // 日期 ref（解决中文浏览器 date input 占位符问题）
  const authExpiryRef = useRef<HTMLInputElement>(null);
  const editAuthExpiryRef = useRef<HTMLInputElement>(null);

  // 公开记录相关状态
  const [publicSubTab, setPublicSubTab] = useState<'apply' | 'search'>('apply');

  // 授权记录子标签 + 查看标题
  const [accessibleSubTab, setAccessibleSubTab] = useState<'viewable' | 'title-search'>('viewable');
  const [titleSearchQuery, setTitleSearchQuery] = useState('');
  const [titleSearchUsers, setTitleSearchUsers] = useState<UserSearchResult[]>([]);
  const [titleSearchPerson, setTitleSearchPerson] = useState<UserSearchResult | null>(null);
  const [titleSearchResults, setTitleSearchResults] = useState<Record[]>([]);
  const [searchingTitles, setSearchingTitles] = useState(false);

  const searchUsersForTitles = async (query: string) => {
    setTitleSearchQuery(query);
    setTitleSearchPerson(null);
    setTitleSearchResults([]);
    if (!query.trim()) { setTitleSearchUsers([]); return; }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setTitleSearchUsers(data.users || []);
    } catch { setTitleSearchUsers([]); }
  };

  const selectPersonForTitles = async (person: UserSearchResult) => {
    setTitleSearchPerson(person);
    setTitleSearchUsers([]);
    setSearchingTitles(true);
    try {
      const res = await fetch(`/api/records?userId=${person.id}&limit=100`);
      const data = await res.json();
      if (data.success) setTitleSearchResults(data.records || []);
    } catch { setTitleSearchResults([]); }
    finally { setSearchingTitles(false); }
  };
  const [publicPerson, setPublicPerson] = useState<UserSearchResult | null>(null);
  const [publicPersonRecords, setPublicPersonRecords] = useState<Record[]>([]);
  const [selectedPublicRecordIds, setSelectedPublicRecordIds] = useState<string[]>([]);
  const [publicDescription, setPublicDescription] = useState('');
  const [submittingPublic, setSubmittingPublic] = useState(false);

  // 查询维权记录
  const [publicSearchQuery, setPublicSearchQuery] = useState('');
  const [publicUserResults, setPublicUserResults] = useState<UserSearchResult[]>([]);
  const [publicSearchResults, setPublicSearchResults] = useState<any[]>([]);
  const [searchingPublic, setSearchingPublic] = useState(false);
  const [searchedPerson, setSearchedPerson] = useState<UserSearchResult | null>(null);

  // 加载被公开人的维权沟通记录
  const loadPublicPersonRecords = async (personId: string) => {
    try {
      const res = await fetch(`/api/records?userId=${personId}&limit=200`);
      const data = await res.json();
      if (data.success) {
        // 过滤出维权沟通类型(102)的记录
        const weiQuanRecords = (data.records || []).filter((r: any) => {
          const rt = r.record_type || '';
          return rt === '102' || rt.split(',').map((s: string) => s.trim()).includes('102');
        });
        setPublicPersonRecords(weiQuanRecords);
        setSelectedPublicRecordIds([]);
      }
    } catch (e) {
      console.error('加载记录失败:', e);
    }
  };

  // 提交公开申请
  const handleApplyPublic = async () => {
    if (!currentUser?.id || !publicPerson) return;
    if (selectedPublicRecordIds.length === 0) { alert('请选择至少一条维权记录'); return; }
    setSubmittingPublic(true);
    try {
      const res = await fetch('/api/public-records/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          publicPersonId: publicPerson.id,
          publicPersonName: publicPerson.real_name || publicPerson.display_name || '',
          publicPersonPhone: publicPerson.phone || '',
          recordIds: selectedPublicRecordIds,
          description: publicDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('申请已提交，等待管理员审核');
        setPublicPerson(null);
        setPublicPersonRecords([]);
        setSelectedPublicRecordIds([]);
        setPublicDescription('');
      } else {
        alert(data.error || '提交失败');
      }
    } catch (e) {
      console.error('提交公开申请失败:', e);
      alert('提交失败');
    } finally {
      setSubmittingPublic(false);
    }
  };

  // 输入关键字搜索用户
  const searchPublicUsers = async (query: string) => {
    setPublicSearchQuery(query);
    setSearchedPerson(null);
    setPublicSearchResults([]);
    if (!query.trim()) { setPublicUserResults([]); return; }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setPublicUserResults(data.users || []);
    } catch (e) { console.error('搜索用户失败:', e); }
  };

  // 点选用户后查询其公开维权记录
  const selectPublicPerson = async (person: UserSearchResult) => {
    setSearchedPerson(person);
    setPublicUserResults([]);
    setSearchingPublic(true);
    try {
      const q = person.real_name || person.display_name || person.phone || '';
      const res = await fetch(`/api/public-records/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setPublicSearchResults(data.records || []);
    } catch (e) { console.error('查询失败:', e); }
    finally { setSearchingPublic(false); }
  };

  // 认知留痕ID状态
  const [createdRecordId, setCreatedRecordId] = useState<string | null>(null);
  const [recordIdCopied, setRecordIdCopied] = useState(false);

  // 详情弹窗状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState<Record | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [partyUserNames, setPartyUserNames] = useState<{ [key: string]: string }>({}); // 有关方UID→姓名映射

  const getShortRecordId = (id: string) => {
    return 'RCD' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  const copyRecordId = async () => {
    if (createdRecordId) {
      await navigator.clipboard.writeText(getShortRecordId(createdRecordId));
      setRecordIdCopied(true);
      setTimeout(() => setRecordIdCopied(false), 2000);
    }
  };

  // 表单数据
  const [recordForm, setRecordForm] = useState({
    title: '',
    content: '',
    recordType: [] as string[], // 改为多选
    visibility: 'private',
    relationship_id: '',
    relationship_title: '',
    related_type: '',
    related_id: '',
    related_title: '',
    related_parties: [] as UserSearchResult[] // 有关方
  });
  
  // 有关方 - 用户选择
  const [selectedRelatedUsers, setSelectedRelatedUsers] = useState<UserSearchResult[]>([]);

  // 合作事项搜索状态
  const [relationshipSearch, setRelationshipSearch] = useState('');
  const [relationshipResults, setRelationshipResults] = useState<any[]>([]);
  const [showRelationshipDropdown, setShowRelationshipDropdown] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<any>(null);

  // 关联事项数据
  const [relatedItems, setRelatedItems] = useState<any[]>([]);
  const [relatedType, setRelatedType] = useState<'community' | 'project' | 'relationship' | 'activity' | ''>('');
  const [relatedSearch, setRelatedSearch] = useState('');
  const [showRelatedDropdown, setShowRelatedDropdown] = useState(false);

  // 候选有关方（从关联事项自动加载）
  const [candidateParties, setCandidateParties] = useState<UserSearchResult[]>([]);

  // 授权表单（多记录类型）
  const [authorizationForm, setAuthorizationForm] = useState({
    description: '',
    expiry_date: '',
    relationship_id: '',
    relationship_title: '',
    authorized_record_ids: '',
    partner_id: '',
    partner_name: '',
    recordTypes: [] as string[]
  });

  // 关联留痕：当前用户所有记录（打开弹窗时加载）+ 多选
  const [availableRecords, setAvailableRecords] = useState<Record[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // 加载当前用户的记录列表（打开添加授权弹窗时调用）
  const loadUserRecords = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`/api/records?userId=${currentUser.id}&limit=200`);
      const data = await res.json();
      if (data.success) {
        setAvailableRecords(data.records || []);
      }
    } catch (e) {
      console.error('加载记录失败:', e);
    }
  };

  // 授权合作事项搜索状态（用于选择被授权人）
  const [authRelationshipSearch, setAuthRelationshipSearch] = useState('');
  const [authRelationshipResults, setAuthRelationshipResults] = useState<any[]>([]);
  const [showAuthRelationshipDropdown, setShowAuthRelationshipDropdown] = useState(false);
  const [selectedAuthRelationship, setSelectedAuthRelationship] = useState<any>(null);

  // 被授权人列表（UserSelect组件用）
  const [selectedGrantees, setSelectedGrantees] = useState<UserSearchResult[]>([]);
  // 候选被授权人（从关联留痕的有关方自动加载）
  const [candidateGrantees, setCandidateGrantees] = useState<UserSearchResult[]>([]);

  const [dynamicRecordCategories, setDynamicRecordCategories] = useState<{id: string, name: string}[]>([]);

  // 仅使用后台管理分类
  const effectiveRecordTypes = dynamicRecordCategories.map(c => ({ value: String(c.id), label: c.name }));

  // 备用检查：直接从 localStorage 读取用户数据
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user') || localStorage.getItem('user_data');
      if (savedUser) {
        setLocalUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const currentUser = user || localUser;

  // 登录保护：未登录或会话过期 → 强制跳转登录页
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = localStorage.getItem('user') || localStorage.getItem('user_data');
    const sessionTime = localStorage.getItem('login_session_time');
    if (!userData || !sessionTime) {
      window.location.href = '/login';
      return;
    }
    const isRemember = localStorage.getItem('remember_me') === 'true';
    const duration = isRemember ? SESSION_LONG : SESSION_SHORT;
    const elapsed = Date.now() - parseInt(sessionTime, 10);
    if (!isNaN(elapsed) && elapsed >= duration) {
      // 会话过期，清理并跳转
      localStorage.removeItem('user');
      localStorage.removeItem('user_data');
      localStorage.removeItem('token');
      localStorage.removeItem('login_session_time');
      window.location.href = '/login';
    }
  }, []);

  // 获取记录分类（与后台 record_type 打通）
  const fetchRecordCategories = async () => {
    try {
      const res = await fetch('/api/categories?type=record_type');
      const data = await res.json();
      if (data.success && data.categories?.length > 0) {
        setDynamicRecordCategories(data.categories.map((c: any) => ({ id: String(c.id), name: c.name })));
      }
    } catch (e) { /* ignore, fallback to hardcoded */ }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
      fetchRecordCategories();
    }
  }, [currentUser, activeTab]);

  // 当选择被公开人后自动加载其维权沟通记录
  useEffect(() => {
    if (publicPerson?.id) {
      loadPublicPersonRecords(publicPerson.id);
    } else {
      setPublicPersonRecords([]);
      setSelectedPublicRecordIds([]);
    }
  }, [publicPerson?.id]);

  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      if (activeTab === 'records') {
        const response = await fetch(`/api/records?userId=${currentUser.id}`);
        const data = await response.json();
        if (data.success) {
          setRecords(data.records || []);
          // 批量加载有关方姓名
          const allUids: string[] = [];
          (data.records || []).forEach((r: any) => {
            const parties = r.related_parties || [];
            parties.forEach((p: any) => { if (typeof p === 'string') allUids.push(p); });
          });
          if (allUids.length > 0) {
            try {
              const usersRes = await fetch(`/api/users/batch?ids=${[...new Set(allUids)].join(',')}`);
              const usersData = await usersRes.json();
              if (usersData.success && usersData.users) {
                const map: { [key: string]: string } = {};
                usersData.users.forEach((u: any) => { map[u.id] = u.real_name || u.display_name || u.id; });
                setPartyUserNames(prev => ({ ...prev, ...map }));
              }
            } catch {}
          }
        }
      } else if (activeTab === 'authorizations') {
        const response = await fetch(`/api/authorizations?userId=${currentUser.id}`);
        const data = await response.json();
        if (data.success) setAuthorizations(data.authorizations || []);
      } else if (activeTab === 'accessible') {
        // 获取被授权的记录
        const response = await fetch(`/api/authorizations/accessible?userId=${currentUser.id}`);
        const data = await response.json();
        if (data.success) setRecords(data.records || []);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索认知留痕记录
  const searchAuthRelationships = async (term: string) => {
    setAuthRelationshipSearch(term);
    setShowAuthRelationshipDropdown(true);

    // 空搜索：显示最近10条
    if (!term || term.trim().length === 0) {
      try {
        const response = await fetch(`/api/records?userId=${currentUser.id}&limit=10`);
        const data = await response.json();
        if (data.success) {
          setAuthRelationshipResults(data.records || []);
        }
      } catch (e) { console.error('搜索认知留痕失败:', e); }
      return;
    }

    try {
      const response = await fetch(`/api/records?userId=${currentUser.id}&limit=100`);
      const data = await response.json();
      if (data.success) {
        const cleanedTerm = term.toUpperCase().replace(/^RCD/, ''); // 去掉RCD前缀
        const searchLower = term.toLowerCase();
        const searchUpper = term.toUpperCase();
        const filtered = (data.records || []).filter((r: any) => {
          const fullId = (r.id || '').toUpperCase();
          const recordShortId = fullId.replace(/^RCD/, '').replace(/-/g, '').slice(0, 8);
          const title = (r.title || '').toLowerCase();
          const content = (r.content || '').toLowerCase();
          const termClean = term.toUpperCase().replace(/^RCD/, '').replace(/-/g, '').slice(0, 8);
          return fullId.includes(searchUpper) ||
                 recordShortId.includes(termClean) ||
                 termClean.includes(recordShortId) ||
                 title.includes(searchLower) ||
                 content.includes(searchLower);
        });
        setAuthRelationshipResults(filtered);
      }
    } catch (error) {
      console.error('搜索认知留痕失败:', error);
    }
  };

  // 选择认知留痕记录
  const selectAuthRelationship = async (record: any) => {
    console.log('[selectAuthRelationship] 选择记录:', record.id, record.title);
    setSelectedAuthRelationship(record);
    setAuthRelationshipSearch(record.title || record.content?.slice(0, 30) || '无标题');
    setAuthorizationForm(prev => ({
      ...prev,
      authorized_record_id: record.id, // 修复：设置授权的记录ID
      relationship_id: record.related_id || record.relationship_id || null,
      relationship_title: record.related_title || record.relationship_title || null
    }));
    setShowAuthRelationshipDropdown(false);
    console.log('[selectAuthRelationship] 已设置 authorized_record_id:', record.id);

    // 自动加载该记录的有关方作为被授权人候选
    const parties = record.related_parties || [];
    if (parties.length > 0) {
      const candidateGrantees: UserSearchResult[] = parties.map((p: any, idx: number) => {
        if (typeof p === 'string') {
          return { id: p, phone: '', display_name: '用户-' + p.slice(0, 8), real_name: null, avatar_url: null };
        }
        return {
          id: p.id || p.user_id || p,
          phone: p.phone || '',
          display_name: p.name || p.display_name || p.real_name || '用户',
          real_name: p.real_name || null,
          avatar_url: p.avatar_url || null
        };
      });
      setCandidateGrantees(candidateGrantees);
      console.log('[selectAuthRelationship] 加载候选被授权人:', candidateGrantees.length, candidateGrantees);
    } else {
      setCandidateGrantees([]);
    }
  };

  // 清除认知留痕选择
  const clearAuthRelationship = () => {
    setSelectedAuthRelationship(null);
    setAuthRelationshipSearch('');
    setAuthRelationshipResults([]);
    setAuthorizationForm(prev => ({
      ...prev,
      relationship_id: '',
      relationship_title: ''
    }));
    setCandidateGrantees([]);
  };

  // 获取关联事项列表
  const fetchRelatedItems = async (type: 'community' | 'project' | 'relationship' | 'activity') => {
    try {
      let url = '';
      if (type === 'community') {
        url = '/api/communities?limit=100';
      } else if (type === 'project') {
        url = '/api/projects?limit=100';
      } else if (type === 'relationship') {
        url = '/api/relationships?limit=100';
      } else if (type === 'activity') {
        url = '/api/activities?limit=100';
      }
      
      if (url) {
        if (type === 'relationship' && currentUser?.id) url += `&userId=${currentUser.id}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setRelatedItems(data.communities || data.projects || data.relationships || data.activities || []);
        }
      }
    } catch (error) {
      console.error('获取关联事项失败:', error);
    }
  };

  // 切换关联类型
  const handleRelatedTypeChange = (type: 'community' | 'project' | 'relationship' | 'activity') => {
    setRelatedType(type);
    setRecordForm(prev => ({ ...prev, related_type: type, related_id: '', related_title: '' }));
    setRelatedSearch('');
    fetchRelatedItems(type);
    setShowRelatedDropdown(true);
  };

  // 选择关联事项 → 自动加载有关方成员
  const handleRelatedSelect = async (item: any) => {
    let title = '';
    if (relatedType === 'community') {
      title = item.name;
    } else if (relatedType === 'project') {
      title = item.title;
    } else if (relatedType === 'relationship') {
      title = item.title;
    } else if (relatedType === 'activity') {
      title = item.title;
    }
    setRelatedSearch(title);
    // 自动生成留痕标题：避免"关于"嵌套
    const recordTitle = title.startsWith('关于')
      ? `有关“${title}”的留痕记录`
      : `关于「${title}」的留痕记录`;
    setRecordForm(prev => ({ 
      ...prev, 
      related_id: item.id, 
      related_title: title,
      title: prev.title || recordTitle
    }));
    setShowRelatedDropdown(false);

    // 自动加载关联事项的成员作为候选有关方
    await loadCandidateParties(relatedType, item.id, title);
  };

  // 加载关联事项的候选有关方
  const loadCandidateParties = async (type: string, itemId: string, itemTitle: string) => {
    try {
      let members: UserSearchResult[] = [];

      if (type === 'community') {
        // 从 /api/communities 列表获取并找到匹配的社区，解析 memberList 数据
        const res = await fetch('/api/communities?limit=100');
        const data = await res.json();
        const community = (data.communities || []).find((c: any) => c.id === itemId);
        if (!community) { console.warn('未找到共同体:', itemId); return; }
        // memberList: 列表中已解析为数组，结构 [{id, role, joinedAt}]
        const ml = community.memberList || [];
        if (ml.length > 0) {
          members = ml.map((m: any) => ({
            id: m.id || m.userId || '',
            phone: '',
            display_name: m.name || m.userName || m.role || '成员',
            real_name: null,
            avatar_url: null
          }));
        }
        // memberList为空时，owner也算相关方
        if (members.length === 0 && community.ownerId) {
          members = [{
            id: community.ownerId,
            phone: '',
            display_name: community.ownerName || '创建者',
            real_name: null,
            avatar_url: null
          }];
        }
      } else if (type === 'project') {
        const res = await fetch('/api/projects?limit=100');
        const data = await res.json();
        const project = (data.projects || []).find((p: any) => p.id === itemId);
        if (!project) { console.warn('未找到项目:', itemId); return; }
        const projMembers = project.members || [];
        members = projMembers.map((m: any) => ({
          id: m.id || m.userId || m.user_id || '',
          phone: '',
          display_name: m.name || m.userName || m.user_name || '成员',
          real_name: null,
          avatar_url: null
        }));
      } else if (type === 'relationship') {
        // 合作事项有关方 = 合作双方
        const res = await fetch('/api/relationships?userId=' + currentUser?.id);
        const data = await res.json();
        const rel = (data.relationships || []).find((r: any) => r.id === itemId);
        if (rel) {
          members = [{
            id: rel.partner_id || rel.partnerId || '',
            phone: '',
            display_name: rel.partner_name || rel.partnerName || '合作方',
            real_name: null,
            avatar_url: null
          }];
        }
      }

      // 去重后合并到 selectedRelatedUsers（自动添加）
      console.log('[loadCandidateParties] type:', type, 'members:', members.length, members.map(m => m.display_name));
      if (members.length > 0) {
        setSelectedRelatedUsers(prev => {
          const existing = new Set(prev.map(u => u.id));
          const newOnes = members.filter(m => !existing.has(m.id));
          console.log('[loadCandidateParties] adding:', newOnes.length, 'new members');
          return [...prev, ...newOnes];
        });
      } else {
        console.warn('[loadCandidateParties] no members found for', type, itemId);
      }

      // 同时保存到候选列表展示
      setCandidateParties(members);
    } catch (e) {
      console.error('加载候选有关方失败:', e);
    }
  };

  // 清除关联事项
  const clearRelated = () => {
    setRelatedType('');
    setRelatedItems([]);
    setRelatedSearch('');
    setSelectedRelatedUsers([]);
    setCandidateParties([]);
    setRecordForm(prev => ({ ...prev, related_type: '', related_id: '', related_title: '' }));
  };

  // 多选/单选记录类型切换
  const toggleRecordType = (value: string) => {
    setAuthorizationForm(prev => {
      const current = prev.recordTypes;
      if (current.includes(value)) {
        return { ...prev, recordTypes: current.filter(v => v !== value) };
      } else {
        return { ...prev, recordTypes: [...current, value] };
      }
    });
  };

  // 添加记录
  const handleAddRecord = async () => {
    console.log('[handleAddRecord] FIRE, currentUser:', JSON.stringify(currentUser), 'title:', recordForm.title);
    if (!currentUser?.id) {
      console.error('[handleAddRecord] BLOCKED: currentUser has no id', currentUser);
      alert('请先登录（用户信息缺失，将被引导至登录页）');
      window.location.href = '/login';
      return;
    }
    if (!recordForm.title.trim()) {
      alert('请输入标题');
      return;
    }
    if (recordForm.recordType.length === 0) {
      alert('请选择至少一个类型');
      return;
    }
    setSavingRecord(true);
    try {
      // 构建 related_items 数组
      const relatedItems = recordForm.related_id && recordForm.related_type
        ? [{ type: recordForm.related_type, id: recordForm.related_id, title: recordForm.related_title }]
        : [];
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: recordForm.title,
          content: recordForm.content,
          recordType: recordForm.recordType,
          tags: '',
          visibility: recordForm.visibility,
          related_items: relatedItems,
          related_parties: selectedRelatedUsers.map(u => u.id) || []
        })
      });
      const data = await response.json();
      if (data.success) {
        setCreatedRecordId(data.id);
        setShowAddRecordModal(false);
        setRecordForm({ title: '', content: '', recordType: [] as string[], visibility: 'private', relationship_id: '', relationship_title: '', related_type: '', related_id: '', related_title: '', related_parties: [] as UserSearchResult[] });
        setSelectedRelatedUsers([]);
        clearRelated();
        fetchData();
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error: any) {
      console.error('添加记录失败:', error);
      alert('添加失败: ' + (error?.message || '未知错误'));
    } finally {
      setSavingRecord(false);
    }
  };

  // 添加授权
  const handleAddAuthorization = async (e?: React.MouseEvent) => {
    try {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      
      if (!currentUser?.id) {
        alert('请先登录');
        window.location.href = '/login';
        return;
      }
      
      if (!authorizationForm.partner_id) {
        alert('请选择被授权人');
        return;
      }
      
      if (authorizationForm.recordTypes.length === 0) {
        alert('请选择至少一个授权查看类型');
        return;
      }
      
      if (selectedRecordIds.length === 0) {
        alert('请至少选择一条关联留痕');
        return;
      }
      
      const requestBody = {
        userId: currentUser.id,
        partner_id: authorizationForm.partner_id,
        partner_name: authorizationForm.partner_name,
        authorized_record_ids: selectedRecordIds.join(','),
        scope: authorizationForm.recordTypes,
        description: authorizationForm.description,
        expiry_date: authExpiryRef.current?.value || authorizationForm.expiry_date || null,
        relationship_id: authorizationForm.relationship_id || null,
        relationship_title: authorizationForm.relationship_title || null
      };
      console.log('[handleAddAuthorization] request body:', requestBody);
      
      const response = await fetch('/api/authorizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowAddAuthorizationModal(false);
        resetAuthorizationForm();
        fetchData();
      } else {
        alert('保存失败：' + (data.error || '未知错误'));
      }
    } catch (error: any) {
      console.error('[handleAddAuthorization] ERROR:', error);
      alert('发生异常：' + (error?.message || '未知错误'));
    }
  };

  // 删除授权
  const handleDeleteAuthorization = async (id: string) => {
    if (!confirm('确定要删除此授权吗？')) return;
    try {
      const response = await fetch(`/api/authorizations?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchData();
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除授权失败:', error);
    }
  };

  // 打开编辑授权弹窗
  const openEditAuth = (auth: Authorization, readonly = false) => {
    setEditingAuth(auth);
    setViewOnlyAuth(readonly);
    setEditAuthForm({
      description: auth.description || '',
      expiry_date: auth.expiry_date ? auth.expiry_date.slice(0, 10) : '',
      scope: auth.scope ? auth.scope.split(',').map(s => s.trim()).filter(Boolean) : [],
      status: auth.status || 'active'
    });
    setShowEditAuthModal(true);
  };

  // 保存编辑
  const handleUpdateAuth = async () => {
    if (!editingAuth) return;
    setSavingAuth(true);
    try {
      const res = await fetch('/api/authorizations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAuth.id,
          scope: editAuthForm.scope,
          description: editAuthForm.description,
          expiry_date: editAuthExpiryRef.current?.value || editAuthForm.expiry_date || null,
          status: editAuthForm.status
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditAuthModal(false);
        setEditingAuth(null);
        setViewOnlyAuth(false);
        fetchData();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (e) {
      console.error('更新授权失败:', e);
      alert('更新失败');
    } finally {
      setSavingAuth(false);
    }
  };

  // 重置授权弹窗
  const resetAuthorizationForm = () => {
    setAuthorizationForm({ description: '', expiry_date: '', relationship_id: '', relationship_title: '', authorized_record_ids: '', partner_id: '', partner_name: '', recordTypes: [] });
    setSelectedGrantees([]);
    setCandidateGrantees([]);
    setSelectedRecordIds([]);
    clearAuthRelationship();
  };

  // ===== 记录详情弹窗 + 沟通互动 =====
  const openRecordDetail = async (record: Record) => {
    setDetailRecord(record);
    setShowDetailModal(true);
    setLoadingDetail(true);
    setComments([]);
    setNewComment('');

    // 并行获取详情和评论
    const [detailRes, commentsRes] = await Promise.all([
      fetch(`/api/records/${record.id}`),
      fetch(`/api/records/comments?recordId=${record.id}&userId=${user?.id || ''}`)
    ]);

    if (detailRes.ok) {
      const detailData = await detailRes.json();
      if (detailData.success) {
        setDetailRecord(detailData.record);
        // 获取有关方的用户姓名
        const parties = detailData.record.related_parties || [];
        if (parties.length > 0) {
          const ids = parties.map((p: any) => typeof p === 'string' ? p : p.id).filter(Boolean);
          if (ids.length > 0) {
            try {
              const usersRes = await fetch(`/api/users/batch?ids=${ids.join(',')}`);
              const usersData = await usersRes.json();
              if (usersData.success && usersData.users) {
                const map: { [key: string]: string } = { ...partyUserNames };
                usersData.users.forEach((u: any) => { map[u.id] = u.real_name || u.display_name || u.id; });
                setPartyUserNames(map);
              }
            } catch {}
          }
        }
      }
    }

    if (commentsRes.ok) {
      const commentsData = await commentsRes.json();
      if (commentsData.success) {
        setComments(commentsData.comments || []);
      }
    }

    setLoadingDetail(false);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setDetailRecord(null);
    setComments([]);
    setNewComment('');
  };

  const submitComment = async () => {
    if (!newComment.trim() || !detailRecord || !user?.id) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/records/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: detailRecord.id,
          userId: user.id,
          userName: user.display_name || user.real_name || '用户',
          content: newComment.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
      } else {
        alert(data.error || '发送失败');
      }
    } catch (error) {
      console.error('发送评论失败:', error);
      alert('发送失败，请重试');
    }
    setSubmittingComment(false);
  };

  const tabs = [
    { id: 'records' as TabType, label: '认知留痕', icon: FileText },
    { id: 'authorizations' as TabType, label: '授权查询', icon: Key },
    { id: 'accessible' as TabType, label: '授权记录', icon: Eye },
    { id: 'public' as TabType, label: '维权记录', icon: Shield }
  ];

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const termUpper = searchTerm.toUpperCase();
    const shortId = r.related_id ? r.related_id.replace(/-/g, '').slice(0, 8).toUpperCase() : '';
    const recordShortId = r.id ? r.id.replace(/-/g, '').slice(0, 8).toUpperCase() : '';
    return termUpper === shortId || termUpper === recordShortId ||
           r.title?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredAuthorizations = authorizations.filter(a =>
    !searchTerm || 
    a.grantee_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.grantee_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRecordTypeIcon = (type: any) => {
    // 确保 type 是字符串
    const typeStr = Array.isArray(type) ? type.join(',') : String(type || '');
    const firstType = typeStr.includes(',') ? typeStr.split(',')[0].trim() : typeStr;
    switch (firstType) {
      case 'insight': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'learning': return <FileText className="w-4 h-4 text-green-500" />;
      case 'reflection': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'achievement': return <Scale className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRecordTypeLabel = (type: any) => {
    if (!type) return '';
    // 支持逗号分隔的多个类型，也支持数组
    const typeStr = Array.isArray(type) ? type.join(',') : String(type);
    if (typeStr.includes(',')) {
      return typeStr.split(',').map(t => {
        const option = effectiveRecordTypes.find(o => o.value === t.trim());
        return option?.label || t.trim();
      }).join(', ');
    }
    const option = effectiveRecordTypes.find(o => o.value === typeStr);
    return option?.label || typeStr;
  };

  const getRecordTypeBg = (type: any) => {
    const colors = [
      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
      'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
      'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
      'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
      'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400'
    ];
    const typeStr = Array.isArray(type) ? type[0] : String(type || '');
    const idx = effectiveRecordTypes.findIndex(o => o.value === typeStr || o.value === (typeStr.includes(',') ? typeStr.split(',')[0].trim() : typeStr));
    return idx >= 0 ? colors[idx % colors.length] : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
  };

  // 将 scope 字段（逗号分隔）解析为类型标签数组
  const getScopeLabels = (scope: string) => {
    if (!scope) return [];
    return scope.split(',').map(s => getRecordTypeLabel(s.trim())).filter(Boolean);
  };

  // 获取记录类型的按钮样式
  const getRecordTypeBtnClass = (value: string) => {
    const isSelected = authorizationForm.recordTypes.includes(value);
    return `px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
      isSelected
        ? 'bg-indigo-500 text-white'
        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
    }`;
  };

  // 未登录 → 显示跳转中（useEffect 会触发强制跳转）
  if (!currentUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-500">请先登录...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">记录中心（正心链）v2</h1>
                <p className="text-white/80">忧人心多变，就上正心链！(已更新)</p>
              </div>
              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                {activeTab === 'records' && (
                  <button
                    onClick={() => { clearRelated(); setShowAddRecordModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加记录
                  </button>
                )}
                {activeTab === 'authorizations' && (
                  <button
                    onClick={() => { resetAuthorizationForm(); setShowAddAuthorizationModal(true); loadUserRecords(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-white/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    添加授权
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 py-4 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 搜索 - 维权记录页不显示 */}
        {activeTab !== 'public' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={`搜索${tabs.find(t => t.id === activeTab)?.label}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800"
            />
          </div>
        </div>
        )}

        {/* 内容 */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* 认知留痕 */}
              {activeTab === 'records' && (
                filteredRecords.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>暂无记录</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRecords.map((rec, index) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-200"
                        onClick={() => openRecordDetail(rec)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 cursor-pointer hover:bg-amber-200 transition-colors"
                                onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(getShortRecordId(rec.id)); }}
                                title="点击复制记录ID">
                                {getShortRecordId(rec.id)}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getRecordTypeBg(rec.record_type)}`}>
                                {getRecordTypeIcon(rec.record_type)}
                                {getRecordTypeLabel(rec.record_type)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{rec.title}</h3>
                            {(rec.related_parties || []).length > 0 && (
                              <p className="text-xs text-slate-500 mt-2">
                                <span className="text-slate-400">有关方：</span>
                                {(rec.related_parties || []).map((p: any, i: number) => {
                                  const uid = typeof p === 'string' ? p : (p.id || '');
                                  return (
                                    <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 mr-1">
                                      {partyUserNames[uid] || uid.slice(0, 12)}
                                    </span>
                                  );
                                })}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {rec.created_at ? new Date(rec.created_at).toLocaleString('zh-CN') : ''}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}

              {/* 授权记录 */}
              {activeTab === 'accessible' && (
                <div>
                  {/* 子标签 */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setAccessibleSubTab('title-search')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        accessibleSubTab === 'title-search'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      查看标题
                    </button>
                    <button
                      onClick={() => setAccessibleSubTab('viewable')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        accessibleSubTab === 'viewable'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      可看记录
                    </button>
                  </div>

                  {/* 可看记录 */}
                  {accessibleSubTab === 'viewable' && (
                    filteredRecords.length === 0 ? (
                      <div className="text-center py-20 text-slate-500">
                        <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p>暂无可查看的授权记录</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredRecords.map((rec, index) => (
                          <motion.div
                            key={rec.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-200"
                            onClick={() => openRecordDetail(rec)}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-xs ${getRecordTypeBg(rec.record_type)}`}>
                                    {getRecordTypeLabel(rec.record_type)}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    来自: {rec.grantor_name || rec.grantor_real_name || '授权方'}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-white">{rec.title}</h3>
                                {rec.auth_description && (
                                  <p className="text-sm text-slate-500 mt-1">授权说明: {rec.auth_description}</p>
                                )}
                                {rec.content && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                                    {rec.content.replace(/<[^>]*>/g, '')}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400">
                                  {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  )}

                  {/* 查看标题 */}
                  {accessibleSubTab === 'title-search' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                      {/* 搜索栏 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          查询人员
                        </label>
                        <input
                          type="text"
                          value={titleSearchQuery}
                          onChange={e => searchUsersForTitles(e.target.value)}
                          placeholder="输入姓名关键字搜索..."
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                        {titleSearchUsers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {titleSearchUsers.map((u, i) => (
                              <button
                                key={u.id + '-' + i}
                                onClick={() => selectPersonForTitles(u)}
                                className="px-3 py-1.5 rounded-lg text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 hover:bg-indigo-100 transition-colors"
                              >
                                {u.real_name || u.display_name}{u.phone ? '(尾号' + u.phone.slice(-4) + ')' : ''}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {titleSearchPerson && (
                        <p className="text-sm text-indigo-500">
                          查询对象：{titleSearchPerson.real_name || titleSearchPerson.display_name}
                        </p>
                      )}

                      {searchingTitles && (
                        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                      )}

                      {!searchingTitles && titleSearchPerson && titleSearchResults.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">该人员暂无可查看记录</p>
                      )}

                      {titleSearchResults.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-400">找到 {titleSearchResults.length} 条记录（仅显示标题）</p>
                          {titleSearchResults.map(rec => (
                            <div key={rec.id} className="flex items-center gap-3 px-4 py-2.5 border border-slate-100 dark:border-slate-700 rounded-lg">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${getRecordTypeBg(rec.record_type)}`}>
                                {getRecordTypeLabel(rec.record_type)}
                              </span>
                              <span className="text-sm text-slate-900 dark:text-white flex-1 truncate">{rec.title || '无标题'}</span>
                              <span className="text-xs text-slate-400">{rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 维权记录 */}
              {activeTab === 'public' && (
                <div>
                  {/* 子标签 */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setPublicSubTab('apply')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        publicSubTab === 'apply'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      申请公开维权记录
                    </button>
                    <button
                      onClick={() => setPublicSubTab('search')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        publicSubTab === 'search'
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      查询维权记录
                    </button>
                  </div>

                  {/* 申请公开维权记录 */}
                  {publicSubTab === 'apply' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
                      {/* 被公开人搜索 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          被公开人 <span className="text-red-500">*</span>
                        </label>
                        <UserSelect
                          onSelect={user => {
                            setPublicPerson(user);
                            setPublicPersonRecords([]);
                            setSelectedPublicRecordIds([]);
                          }}
                          onRemove={() => setPublicPerson(null)}
                          selectedUsers={publicPerson ? [publicPerson] : []}
                          placeholder="搜索选择被公开人..."
                        />
                        {publicPerson && (
                          <p className="text-xs text-indigo-500 mt-1">
                            已选：{publicPerson.real_name || publicPerson.display_name}
                          </p>
                        )}
                      </div>

                      {/* 维权沟通记录列表 */}
                      {publicPerson && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            关联留痕（维权沟通）<span className="text-red-500">*</span>
                          </label>
                          {publicPersonRecords.length === 0 ? (
                            <p className="text-sm text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                              该人员暂无维权沟通记录
                            </p>
                          ) : (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-72 overflow-y-auto">
                              {publicPersonRecords.map(rec => {
                                const isSelected = selectedPublicRecordIds.includes(rec.id);
                                return (
                                  <label
                                    key={rec.id}
                                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                                      isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setSelectedPublicRecordIds(prev =>
                                          isSelected ? prev.filter(id => id !== rec.id) : [...prev, rec.id]
                                        );
                                      }}
                                      className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm text-slate-900 dark:text-white truncate">{rec.title || '无标题'}</span>
                                      {rec.content && (
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{rec.content.replace(/<[^>]*>/g, '').slice(0, 60)}</p>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                          {selectedPublicRecordIds.length > 0 && (
                            <p className="text-xs text-indigo-500 mt-1">已选 {selectedPublicRecordIds.length} 条记录</p>
                          )}
                        </div>
                      )}

                      {/* 申请说明 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">申请说明</label>
                        <textarea
                          value={publicDescription}
                          onChange={e => setPublicDescription(e.target.value)}
                          rows={3}
                          placeholder="请说明公开维权记录的原因"
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm resize-none"
                        />
                      </div>

                      <button
                        onClick={handleApplyPublic}
                        disabled={submittingPublic || !publicPerson || selectedPublicRecordIds.length === 0}
                        className="w-full py-3 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50"
                      >
                        {submittingPublic ? '提交中...' : '提交公开申请'}
                      </button>
                    </div>
                  )}

                  {/* 查询维权记录 */}
                  {publicSubTab === 'search' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
                      {/* 搜索框 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          查询人员
                        </label>
                        <input
                          type="text"
                          value={publicSearchQuery}
                          onChange={e => searchPublicUsers(e.target.value)}
                          placeholder="输入姓名关键字搜索..."
                          className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                        />
                      </div>

                      {/* 匹配的用户列表 */}
                      {publicUserResults.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {publicUserResults.map((u, idx) => (
                            <button
                              key={u.id + '-' + idx}
                              onClick={() => selectPublicPerson(u)}
                              className="px-3 py-1.5 rounded-lg text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                            >
                              {u.real_name || u.display_name}{u.phone ? '(尾号' + u.phone.slice(-4) + ')' : ''}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 已选人员 */}
                      {searchedPerson && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">查询对象：</span>
                          <span className="px-3 py-1 rounded-lg text-sm bg-indigo-500 text-white flex items-center gap-1">
                            {searchedPerson.real_name || searchedPerson.display_name}
                            <button
                              onClick={() => { setSearchedPerson(null); setPublicSearchResults([]); setPublicSearchQuery(''); }}
                              className="ml-1 hover:opacity-70"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </div>
                      )}

                      {/* 加载中 */}
                      {searchingPublic && (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                      )}

                      {/* 查询结果 */}
                      {!searchingPublic && searchedPerson && publicSearchResults.length === 0 && (
                        <p className="text-center text-slate-400 py-8">该人员暂无已公开的维权记录</p>
                      )}
                      {publicSearchResults.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-400">找到 {publicSearchResults.length} 条公开记录</p>
                          {publicSearchResults.map((pr: any) => (
                            <div key={pr.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">已公开</span>
                                <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                                  {getRecordTypeLabel(pr.record_type)}
                                </span>
                              </div>
                              <h4 className="font-medium text-slate-900 dark:text-white">{pr.title}</h4>
                              {pr.content && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
                                  {pr.content.replace(/<[^>]*>/g, '')}
                                </p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                <span>被公开人：{pr.public_person_name}</span>
                                <span>申请人：{pr.applicant_name || pr.applicant_id}</span>
                                <span>{pr.updated_at ? new Date(pr.updated_at).toLocaleDateString() : ''}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 授权查询 */}
              {activeTab === 'authorizations' && (
                filteredAuthorizations.length === 0 ? (
                  <div className="text-center py-20 text-slate-500">
                    <Key className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>暂无授权记录</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAuthorizations.map((auth, index) => (
                      <motion.div
                        key={auth.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {/* 第一行：状态 + 查看类型 */}
                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                auth.status === 'active' ? 'bg-green-100 text-green-700' :
                                auth.status === 'expired' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                {auth.status === 'active' ? '生效中' : auth.status === 'expired' ? '已过期' : '未知'}
                              </span>
                              {getScopeLabels(auth.scope).map((label, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-700">
                                  {label}
                                </span>
                              ))}
                            </div>

                            {/* 四列信息 */}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div>
                                <span className="text-slate-400 text-xs">被查询人员</span>
                                <p className="text-slate-900 dark:text-white font-medium mt-0.5">
                                  {auth.grantor_real_name || auth.grantor_display_name || auth.user_id?.slice(0, 12) || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400 text-xs">被授权人员</span>
                                <p className="text-slate-900 dark:text-white font-medium mt-0.5">
                                  {auth.grantee_name || auth.grantee_email || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400 text-xs">查看类型</span>
                                <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                  {getScopeLabels(auth.scope).join(', ') || '—'}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400 text-xs">有效期</span>
                                <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                  {auth.expiry_date ? auth.expiry_date.slice(0, 10) : '永久'}
                                </p>
                              </div>
                            </div>

                            {auth.description && (
                              <p className="text-xs text-slate-400 mt-3 line-clamp-2">{auth.description}</p>
                            )}
                          </div>
                          {/* 操作图标 */}
                          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                            <button
                              onClick={e => { e.stopPropagation(); openEditAuth(auth, true); }}
                              title="查看"
                              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); openEditAuth(auth, false); }}
                              title="编辑"
                              className="p-2 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* 添加记录弹窗 */}
        {showAddRecordModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => { clearRelated(); setShowAddRecordModal(false); }}
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => { clearRelated(); setShowAddRecordModal(false); }}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加认知留痕</h3>
                  <button onClick={() => { clearRelated(); setShowAddRecordModal(false); }}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* 关联事项 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      关联事项
                    </label>
                    <div className="space-y-2">
                      {/* 关联类型选择 */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('community')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'community'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          共同体
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('project')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'project'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          项目
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('relationship')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'relationship'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          合作事项
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRelatedTypeChange('activity')}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            relatedType === 'activity'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          活动
                        </button>
                        {relatedType && (
                          <button
                            type="button"
                            onClick={clearRelated}
                            className="px-2 py-1.5 text-sm text-slate-400 hover:text-red-500"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      
                      {/* 关联事项搜索/选择 */}
                      {relatedType && (
                        <div className="relative">
                          <input
                            type="text"
                            value={relatedSearch}
                            onChange={e => {
                              setRelatedSearch(e.target.value);
                              setShowRelatedDropdown(true);
                            }}
                            onFocus={() => setShowRelatedDropdown(true)}
                            placeholder={`搜索${relatedType === 'community' ? '共同体' : relatedType === 'project' ? '项目' : relatedType === 'relationship' ? '合作事项' : '活动'}...`}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                          />
                          {showRelatedDropdown && (
                            (() => {
                              const filtered = relatedSearch.trim()
                                ? relatedItems.filter(item => {
                                    const title = relatedType === 'community' ? item.name : item.title;
                                    return (title || '').toLowerCase().includes(relatedSearch.toLowerCase());
                                  })
                                : relatedItems;
                              if (filtered.length > 0) {
                                return (
                                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filtered.map(item => {
                                      const title = relatedType === 'community' ? item.name : item.title;
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() => handleRelatedSelect(item)}
                                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                        >
                                          {title}
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              } else if (relatedSearch.trim()) {
                                return (
                                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-center text-sm text-slate-400">
                                    未找到匹配结果
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 标题 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={recordForm.title}
                      onChange={e => setRecordForm({ ...recordForm, title: e.target.value })}
                      placeholder="选择关联事项后自动生成，可手动修改"
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  
                  {/* 有关方 - 用户选择 + 关联事项自动加载 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      有关方
                    </label>
                    {/* 已选有关方 */}
                    {selectedRelatedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedRelatedUsers.map((user, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-full text-sm text-indigo-700 dark:text-indigo-300">
                            {user.display_name || user.real_name || user.phone || '未知'}
                            <button
                              onClick={() => setSelectedRelatedUsers(prev => prev.filter((_, i) => i !== idx))}
                              className="ml-1 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <UserSelect
                      onSelect={user => {
                        if (!selectedRelatedUsers.find(u => u.id === user.id)) {
                          setSelectedRelatedUsers([...selectedRelatedUsers, user]);
                        }
                      }}
                      onRemove={userId => setSelectedRelatedUsers(prev => prev.filter(u => u.id !== userId))}
                      selectedUsers={selectedRelatedUsers}
                      placeholder="搜索添加有关方..."
                    />
                    {/* 候选有关方提示（从关联事项自动加载） */}
                    {candidateParties.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        已从关联事项自动添加 {candidateParties.length} 名成员
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      类型 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {dynamicRecordCategories.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const current = recordForm.recordType;
                            const next = current.includes(String(opt.id))
                              ? current.filter(v => v !== String(opt.id))
                              : [...current, String(opt.id)];
                            setRecordForm({ ...recordForm, recordType: next });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            recordForm.recordType.includes(String(opt.id))
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      内容
                    </label>
                    <textarea
                      value={recordForm.content}
                      onChange={e => setRecordForm({ ...recordForm, content: e.target.value })}
                      placeholder="请输入内容"
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => { clearRelated(); setShowAddRecordModal(false); }}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      取消
                    </button>
                    <button
                      id="save-record-btn"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleAddRecord(); }}
                      disabled={savingRecord}
                      className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {savingRecord && <Loader2 className="w-4 h-4 animate-spin" />}
                      {savingRecord ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 成功弹窗 */}
        <AnimatePresence>
          {createdRecordId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
              onClick={() => setCreatedRecordId(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-sm text-center"
                onClick={e => e.stopPropagation()}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  创建成功
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">
                  认知留痕已保存
                </p>
                <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl mb-4">
                  <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                    {getShortRecordId(createdRecordId)}
                  </span>
                  <button
                    onClick={copyRecordId}
                    className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                  >
                    {recordIdCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-amber-500" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setCreatedRecordId(null)}
                  className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  完成
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 添加授权弹窗 */}
        {showAddAuthorizationModal && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}
            />
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}
            >
              <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">添加授权</h3>
                  <button onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* 关联留痕 - 当前用户的所有记录，多选 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      关联留痕 <span className="text-red-500">*</span>
                      <span className="text-xs text-slate-400 ml-1 font-normal">(可多选)</span>
                    </label>
                    {availableRecords.length === 0 ? (
                      <p className="text-sm text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                        暂无认知留痕记录
                      </p>
                    ) : (
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-56 overflow-y-auto">
                        {availableRecords.map(record => {
                          const isSelected = selectedRecordIds.includes(record.id);
                          return (
                            <label
                              key={record.id}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedRecordIds(prev =>
                                    isSelected
                                      ? prev.filter(id => id !== record.id)
                                      : [...prev, record.id]
                                  );
                                }}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${getRecordTypeBg(record.record_type)}`}>
                                    {getRecordTypeLabel(record.record_type)}
                                  </span>
                                  <span className="text-sm text-slate-900 dark:text-white truncate">
                                    {record.title || record.content?.slice(0, 30) || '无标题'}
                                  </span>
                                </div>
                                {record.content && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{record.content.slice(0, 60)}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {selectedRecordIds.length > 0 && (
                      <p className="text-xs text-indigo-500 mt-1">
                        已选 {selectedRecordIds.length} 条记录
                      </p>
                    )}
                  </div>

                  {/* 被授权人 - UserSelect组件 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      被授权人 <span className="text-red-500">*</span>
                    </label>

                    {/* 候选有关方（从关联留痕自动加载） */}
                    {candidateGrantees.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-slate-400 mb-2">从关联留痕加载的候选有关方（点击添加）：</p>
                        <div className="flex flex-wrap gap-2">
                          {candidateGrantees.map((user, idx) => {
                            const alreadyAdded = selectedGrantees.find(u => u.id === user.id);
                            return (
                              <button
                                key={user.id + '-' + idx}
                                type="button"
                                disabled={!!alreadyAdded}
                                onClick={() => {
                                  if (!alreadyAdded) {
                                    setSelectedGrantees(prev => [...prev, user]);
                                    setAuthorizationForm(prev => {
                                      const newPartnerIds = [...selectedGrantees.map(u => u.id), user.id];
                                      return {
                                        ...prev,
                                        partner_id: newPartnerIds.join(','),
                                        partner_name: newPartnerIds.map(id => {
                                          const u = [...selectedGrantees, user].find(u => u.id === id);
                                          return u?.real_name || u?.display_name || '用户';
                                        }).join(',')
                                      };
                                    });
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                  alreadyAdded
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-not-allowed'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                }`}
                              >
                                {alreadyAdded ? '✓ ' : ''}{user.real_name || user.display_name || '用户'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <UserSelect
                      onSelect={user => {
                        if (!selectedGrantees.find(u => u.id === user.id)) {
                          setSelectedGrantees([...selectedGrantees, user]);
                          const newPartnerIds = [...selectedGrantees.map(u => u.id), user.id];
                          setAuthorizationForm(prev => ({
                            ...prev,
                            partner_id: newPartnerIds.join(','),
                            partner_name: newPartnerIds.map(id => {
                              const u = [...selectedGrantees, user].find(u => u.id === id);
                              return u?.real_name || u?.display_name || '用户';
                            }).join(',')
                          }));
                        }
                      }}
                      onRemove={userId => {
                        setSelectedGrantees(prev => prev.filter(u => u.id !== userId));
                        setAuthorizationForm(prev => {
                          const newIds = prev.partner_id.split(',').filter(id => id !== userId);
                          const newNames = prev.partner_name.split(',').filter((_, i) => {
                            const ids = prev.partner_id.split(',');
                            return ids[i] !== userId;
                          });
                          return {
                            ...prev,
                            partner_id: newIds.join(','),
                            partner_name: newNames.join(',')
                          };
                        });
                      }}
                      selectedUsers={selectedGrantees}
                      placeholder="搜索添加被授权人..."
                    />
                  </div>

                  {/* 授权查看类型（多选） */}
                  <div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        授权查看类型 <span className="text-red-500">*</span>
                        <span className="text-xs text-slate-400 ml-1 font-normal">(可多选)</span>
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {effectiveRecordTypes.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleRecordType(opt.value)}
                            className={getRecordTypeBtnClass(opt.value)}
                          >
                            {authorizationForm.recordTypes.includes(opt.value) && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {authorizationForm.recordTypes.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          已选: {authorizationForm.recordTypes.map(t => getRecordTypeLabel(t)).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      说明
                    </label>
                    <textarea
                      value={authorizationForm.description}
                      onChange={e => setAuthorizationForm({ ...authorizationForm, description: e.target.value })}
                      placeholder="请输入授权说明"
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      有效期至
                    </label>
                    <input
                      type="date"
                      ref={authExpiryRef}
                      defaultValue={authorizationForm.expiry_date}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => { setShowAddAuthorizationModal(false); resetAuthorizationForm(); }}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      取消
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleAddAuthorization(e); }}
                      className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* ===== 编辑授权弹窗 ===== */}
        {showEditAuthModal && editingAuth && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setShowEditAuthModal(false); setEditingAuth(null); setViewOnlyAuth(false); }} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowEditAuthModal(false); setEditingAuth(null); setViewOnlyAuth(false); }}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {viewOnlyAuth ? '查看授权' : '编辑授权'}
                  </h3>
                  <button onClick={() => { setShowEditAuthModal(false); setEditingAuth(null); setViewOnlyAuth(false); }}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {/* 只读信息 */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-1 text-sm">
                    <div><span className="text-slate-400">被查询人员：</span><span className="text-slate-900 dark:text-white ml-1">{editingAuth.grantor_real_name || editingAuth.grantor_display_name || editingAuth.user_id}</span></div>
                    <div><span className="text-slate-400">被授权人员：</span><span className="text-slate-900 dark:text-white ml-1">{editingAuth.grantee_name}</span></div>
                  </div>

                  {/* 授权查看类型（多选） */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">授权查看类型</label>
                    <div className="flex gap-2 flex-wrap">
                      {effectiveRecordTypes.map(opt => {
                        const isSelected = editAuthForm.scope.includes(opt.value);
                        return (
                          <button
                            key={opt.value} type="button"
                            disabled={viewOnlyAuth}
                            onClick={() => {
                              if (viewOnlyAuth) return;
                              setEditAuthForm(prev => ({
                                ...prev,
                                scope: isSelected ? prev.scope.filter(v => v !== opt.value) : [...prev.scope, opt.value]
                              }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'} ${viewOnlyAuth ? 'cursor-default' : ''}`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 状态 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态</label>
                    <select
                      value={editAuthForm.status}
                      onChange={e => setEditAuthForm(prev => ({ ...prev, status: e.target.value }))}
                      disabled={viewOnlyAuth}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm disabled:opacity-60"
                    >
                      <option value="active">生效中</option>
                      <option value="expired">已过期</option>
                      <option value="pending">待生效</option>
                    </select>
                  </div>

                  {/* 有效期 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">有效期至</label>
                    <input
                      type="date"
                      ref={editAuthExpiryRef}
                      defaultValue={editAuthForm.expiry_date}
                      disabled={viewOnlyAuth}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 disabled:opacity-60"
                    />
                  </div>

                  {/* 说明 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">说明</label>
                    <textarea
                      value={editAuthForm.description}
                      onChange={e => setEditAuthForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      disabled={viewOnlyAuth}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 resize-none disabled:opacity-60"
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { setShowEditAuthModal(false); setEditingAuth(null); setViewOnlyAuth(false); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                      {viewOnlyAuth ? '关闭' : '取消'}
                    </button>
                    {!viewOnlyAuth && (
                      <button onClick={handleUpdateAuth} disabled={savingAuth} className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50">
                        {savingAuth ? '保存中...' : '保存修改'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== 记录详情弹窗 ===== */}
        <AnimatePresence>
          {showDetailModal && detailRecord && (
            <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] overflow-y-auto">
              {/* 遮罩 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeDetailModal}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              />
              {/* 弹窗 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6 mb-10 z-10"
              >
                {loadingDetail ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                ) : (
                  <>
                    {/* 头部 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* 留痕记录ID */}
                        <div>
                          <span className="text-xs text-slate-400">留痕记录ID：</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {getShortRecordId(detailRecord.id)}
                          </span>
                        </div>
                        {/* 标题 */}
                        <div>
                          <span className="text-xs text-slate-400 block">标题：</span>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{detailRecord.title}</h2>
                        </div>
                        {/* 记录类型 */}
                        <div>
                          <span className="text-xs text-slate-400">记录类型：</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1 ${getRecordTypeBg(detailRecord.record_type)}`}>
                            {getRecordTypeIcon(detailRecord.record_type)}
                            {getRecordTypeLabel(detailRecord.record_type)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={closeDetailModal}
                        className="shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* 有关方 */}
                    {detailRecord.related_parties && detailRecord.related_parties.length > 0 && (
                      <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-400 block mb-2">有关方：</span>
                        <div className="flex flex-wrap gap-1.5">
                          {detailRecord.related_parties.map((p: any, i: number) => {
                            const uid = typeof p === 'string' ? p : (p.id || p.user_id || '');
                            const name = partyUserNames[uid] || (typeof p === 'object' ? (p.display_name || p.real_name || p.name) : uid);
                            return (
                              <span key={i} className="px-2 py-0.5 rounded text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 内容 */}
                    {detailRecord.content && (
                      <div className="mb-4">
                        <span className="text-xs text-slate-400 block mb-2">内容：</span>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300"
                            dangerouslySetInnerHTML={{ __html: detailRecord.content }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 创建时间 */}
                    <div className="mb-4 text-xs">
                      <span className="text-slate-400">创建时间：</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {detailRecord.created_at ? new Date(detailRecord.created_at).toLocaleString('zh-CN') : '—'}
                      </span>
                    </div>

                    {/* 分隔线 */}
                    <div className="border-t border-slate-200 dark:border-slate-700 my-4" />

                    {/* 沟通互动 */}
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        <MessageSquare className="w-4 h-4 text-indigo-500" />
                        沟通互动
                      </h3>

                      {/* 评论列表 */}
                      {comments.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">暂无沟通记录，开始互动吧</p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                          {comments.map((comment: any) => (
                            <div key={comment.id} className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                  {(comment.user_name || '匿')[0]}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {comment.user_name || '匿名用户'}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {comment.created_at ? new Date(comment.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 break-words">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 评论输入 */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                          placeholder="输入互动内容，按 Enter 发送..."
                          className="flex-1 px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={submitComment}
                          disabled={!newComment.trim() || submittingComment}
                          className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 shrink-0"
                        >
                          {submittingComment ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            '发送'
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
