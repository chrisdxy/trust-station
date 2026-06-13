"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, MapPin, Users, Clock, Search, Loader2, X, User, Edit, Trash2, CheckCircle, LogOut, ChevronRight, ChevronDown, Image, Copy } from 'lucide-react';
import Layout from '@/components/Layout';
import { WeChatShareSetup } from '@/components/WeChatShareSetup';
import RichTextEditor from '@/components/RichTextEditor';
import AIWriter from '@/components/AIWriter';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';

interface Activity {
  id: string;
  title: string;
  description?: string;
  activity_type?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  max_participants?: number;
  current_participants?: number;
  organizer?: string;
  organizer_id?: string;
  organizer_name?: string;
  organizer_name_selected?: string;
  cover_image?: string;
  qr_code?: string;
  status?: string;
  user_id?: string;
  my_registration_status?: string;
  is_organizer_member?: number | boolean;
  is_paid?: number | boolean;
  price?: number | null;
}

export default function ActivitiesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 全部、我发布的、我报名的
  const [paidFilter, setPaidFilter] = useState('all'); // all, free, paid
  const [showPaidDropdown, setShowPaidDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [organizers, setOrganizers] = useState<UserSearchResult[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState('');
  const [communities, setCommunities] = useState<{ id: string; name: string }[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);

  // 详情弹窗
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 编辑弹窗
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', location: '', start_time: '', end_time: '', max_participants: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 生成简短的活动 ID（显示用）
  const getShortActivityId = (id: string) => {
    return 'ACT' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  // 跳转到独立活动详情页（用于微信分享 OG 卡片）
  const openDetail = (activity: Activity) => {
    router.push(`/activities/${activity.id}`);
  };

  // 报名（从卡片触发）
  const handleRegisterFromCard = async (activity: Activity) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/activities/${activity.id}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('报名成功！');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchActivities();
      } else { alert(data.error || '报名失败'); }
    } catch (e) { alert('网络错误'); }
  };

  // 报名（从详情弹窗触发）
  const handleRegister = async () => {
    if (!user?.id || !detailActivity) return;
    try {
      const res = await fetch(`/api/activities/${detailActivity.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('报名成功！');
        setTimeout(() => setSuccessMsg(''), 3000);
        closeDetail();
        fetchActivities();
      } else {
        setSuccessMsg(data.error || '报名失败');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e) { setSuccessMsg('网络错误'); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  // 取消报名（从卡片触发）
  const handleCancelFromCard = async (activity: Activity) => {
    if (!user?.id) return;
    if (!confirm('确定要取消报名吗？')) return;
    try {
      const res = await fetch(`/api/activities/${activity.id}/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('已取消报名');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchActivities();
      } else { alert(data.error || '取消失败'); }
    } catch (e) { alert('网络错误'); }
  };

  // 取消报名（从详情弹窗触发）
  const handleCancelRegister = async () => {
    if (!user?.id || !detailActivity) return;
    try {
      const res = await fetch(`/api/activities/${detailActivity.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('已取消报名');
        setTimeout(() => setSuccessMsg(''), 3000);
        closeDetail();
        fetchActivities();
      } else {
        setSuccessMsg(data.error || '取消失败');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (e) { setSuccessMsg('网络错误'); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  // 删除活动（两步：先弹确认框，确认后执行）
  const confirmDelete = (activity: Activity) => {
    if (!user?.id) { alert('请先登录'); return; }
    setDeleteTarget(activity);
  };

  const executeDelete = async () => {
    if (!deleteTarget || !user?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/activities/${deleteTarget.id}?userId=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('删除成功');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchActivities();
        if (detailActivity?.id === deleteTarget.id) closeDetail();
      } else {
        setErrorMsg(data.error || '删除失败');
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (e) {
      setErrorMsg('网络错误，请重试');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // 打开编辑弹窗
  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    const fmt = (d?: string) => d ? d.slice(0, 16) : '';
    setEditForm({
      title: activity.title || '',
      description: activity.description || '',
      location: activity.location || '',
      start_time: fmt(activity.start_time),
      end_time: fmt(activity.end_time),
      max_participants: activity.max_participants?.toString() || '50'
    });
    setCoverImage(activity.cover_image || '');
    setCoverImagePreview(activity.cover_image || '');
    setIsPaid(!!activity.is_paid);
    setPrice(activity.price != null ? String(activity.price) : '');
  };

  // 提交编辑
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !editingActivity) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/activities/${editingActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: editForm.title,
          description: editForm.description,
          location: editForm.location,
          start_time: editForm.start_time || null,
          end_time: editForm.end_time || null,
          max_participants: parseInt(editForm.max_participants) || null,
          cover_image: coverImage || null,
          is_paid: isPaid,
          price: isPaid ? (parseFloat(price) || 0) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingActivity(null);
        setSuccessMsg('更新成功');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchActivities();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (e) { alert('网络错误'); }
    setEditSubmitting(false);
  };

  // 处理组织者选择
  const handleOrganizerSelect = (u: UserSearchResult) => {
    const existing = organizers.find(o => o.id === u.id);
    if (existing) {
      setOrganizers(organizers.filter(o => o.id !== u.id));
    } else {
      setOrganizers([...organizers, u]);
    }
  };

  // 处理封面图片上传
  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 预览本地图片
    const reader = new FileReader();
    reader.onload = ev => {
      setCoverImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传到服务器
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        alert('上传失败: ' + (res.status === 413 ? '图片过大' : '服务器错误 ' + res.status));
        return;
      }
      const data = await res.json();
      if (data.success && data.url) {
        setCoverImage(data.url);
      } else {
        alert('上传失败');
      }
    } catch (err) {
      console.error('上传图片失败:', err);
      alert('上传失败，请重试');
    }
  };

  // 清除封面图片
  const handleRemoveCoverImage = () => {
    setCoverImage('');
    setIsPaid(false);
    setPrice('');
    setCoverImagePreview('');
  };

  const formatDateForInput = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try { return new Date(dateStr).toISOString().slice(0, 16); } catch { return ''; }
  };

  useEffect(() => {
    fetchActivities();
    fetch('/api/communities').then(r => r.json()).then(d => {
      if (d.success) setCommunities((d.communities || []).map((c: any) => ({ id: c.id, name: c.name })));
    }).catch(() => {});
    // 处理微信分享链接中的 ?view=xxx，自动打开活动详情
    const viewId = new URLSearchParams(window.location.search).get('view');
    if (viewId) {
      // 先直接获取活动详情
      fetch(`/api/activities/${viewId}${user?.id ? '?userId=' + user.id : ''}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const act = d.activity;
            setDetailActivity({ ...act, my_registration_status: d.registration?.status, is_organizer_member: act.is_organizer_member });
          }
        })
        .catch(() => {});
    }
  }, []);

  // 筛选条件变化时自动刷新
  useEffect(() => {
    fetchActivities();
  }, [typeFilter, paidFilter, filter]);

  // 点击外部关闭收费下拉
  useEffect(() => {
    if (!showPaidDropdown) return;
    const handler = (e: MouseEvent) => setShowPaidDropdown(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showPaidDropdown]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (typeFilter === 'organized') params.set('organized', 'true');
      if (typeFilter === 'joined') params.set('joined', 'true');
      if (paidFilter === 'free') params.set('paid', 'free');
      if (paidFilter === 'paid') params.set('paid', 'paid');
      if (user?.id) params.set('userId', user.id);

      const response = await fetch(`/api/activities?${params}`);
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('获取活动失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      upcoming: '即将开始', ongoing: '进行中', completed: '已结束', cancelled: '已取消'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700', ongoing: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleString('zh-CN') : '';
  const fmtInputDate = (d?: string) => d ? d.slice(0, 16) : '';

  // 我发布的（才有编辑删除权限）
  const isMyPublished = (a: Activity) => user?.id && String(a.user_id) === String(user.id);
  // 我作为组织成员的（不能编辑删除，只能看）
  const isOrganizerMember = (a: Activity) => !!a.is_organizer_member || (user?.id && String(a.organizer_id) === String(user.id));
  // 我报名的
  const isRegistered = (a: Activity) => a.my_registration_status === 'registered';

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium animate-pulse">
            {errorMsg}
          </div>
        )}

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
                    确定要删除活动「{deleteTarget.title}」吗？此操作不可撤销。
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

        {/* 活动ID创建成功弹窗 */}
        <AnimatePresence>
          {createdActivityId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
              onClick={() => setCreatedActivityId(null)}
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">活动发布成功！</h3>
                <p className="text-slate-500 mb-4">您的活动已成功创建</p>
                <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 mb-6">
                  <p className="text-xs text-slate-500 mb-1">活动ID</p>
                  <p className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400 tracking-wider">
                    {getShortActivityId(createdActivityId)}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">可用于分享和引用</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(getShortActivityId(createdActivityId));
                      setSuccessMsg('ID已复制');
                      setTimeout(() => setSuccessMsg(''), 2000);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />复制ID
                  </button>
                  <button
                    onClick={() => setCreatedActivityId(null)}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
                  >
                    完成
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t('activities.title') || '活动中心'}</h1>
                <p className="text-white/80">在活动中相互了解，提升心性，共建互信</p>
              </div>
              {user && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  发布活动
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 筛选 */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="text" placeholder="搜索活动..." className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800" />
            </div>
            <select value={filter} onChange={e => { setFilter(e.target.value); fetchActivities(); }}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
              <option value="">全部状态</option>
              <option value="upcoming">即将开始</option>
              <option value="ongoing">进行中</option>
              <option value="completed">已结束</option>
            </select>
          </div>
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            {[['all', '全部'], ['organized', '我发布的'], ['joined', '我报名的']].map(([v, label]) => {
              const isActive = typeFilter === v;
              const paidLabel = paidFilter === 'free' ? '免费' : paidFilter === 'paid' ? '收费' : '全部';
              return (
                <div key={v} className="relative">
                  <button onClick={() => {
                    if (v === 'all') { setTypeFilter('all'); setShowPaidDropdown(!showPaidDropdown); }
                    else { setTypeFilter(v); setShowPaidDropdown(false); }
                  }}
                    className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1 ${isActive ? 'bg-purple-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    {v === 'all' ? paidLabel : label}
                    {v === 'all' && <ChevronDown className={`w-3 h-3 transition-transform ${showPaidDropdown ? 'rotate-180' : ''}`} />}
                  </button>
                  {v === 'all' && showPaidDropdown && (
                    <div className="absolute top-full left-0 mt-0 bg-white dark:bg-slate-800 rounded-b-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10 min-w-[100px]">
                      {[['all', '全部'], ['free', '免费'], ['paid', '收费']].map(([pv, plabel]) => (
                        <button key={pv} onClick={e => { e.stopPropagation(); setPaidFilter(pv); setShowPaidDropdown(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${paidFilter === pv ? 'text-orange-500 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
                          {plabel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 活动列表 */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
          ) : activities.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>暂无活动</p>
              {user && <p className="text-sm mt-2">点击上方按钮发布第一个活动</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openDetail(activity)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center relative">
                      {activity.cover_image ? (
                      <img src={activity.cover_image} alt={activity.title} className="w-full h-full object-cover" />
                    ) : (
                        <Calendar className="w-7 h-7 text-purple-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(activity.status || 'upcoming')}`}>
                          {getStatusLabel(activity.status || 'upcoming')}
                        </span>
                        {activity.activity_type && <span className="text-xs text-slate-500">{activity.activity_type}</span>}
                        {isRegistered(activity) && (
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded flex items-center gap-0.5">
                            <CheckCircle className="w-3 h-3" />已报名
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{activity.title}</h3>
                      <span className="inline-block px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono cursor-pointer hover:bg-amber-200 transition-colors mt-0.5"
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(getShortActivityId(activity.id)); }}
                        title="点击复制活动ID，用于记录中心查询">
                        活动ID: {getShortActivityId(activity.id)}
                      </span>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                        {(activity.organizer_name_selected || activity.organizer_name) && (
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{activity.organizer_name_selected || activity.organizer_name}</span>
                        )}
                        {activity.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activity.location}</span>}
                        {activity.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(activity.start_time)}</span>}
                        {activity.max_participants && (
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{activity.current_participants || 0}/{activity.max_participants}</span>
                        )}
                        {activity.is_paid && activity.price != null && <span className="text-orange-600">¥{Number(activity.price).toFixed(2)}</span>}
                      </div>
                      {user && (
                        <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                          {isMyPublished(activity) && (
                            <>
                              <button onClick={() => openEdit(activity)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-100 transition-colors"><Edit className="w-3 h-3" />编辑</button>
                              <button onClick={() => confirmDelete(activity)} disabled={deleting} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-colors disabled:opacity-50"><Trash2 className="w-3 h-3" />删除</button>
                            </>
                          )}
                          {isOrganizerMember(activity) && !isMyPublished(activity) && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">组织成员</span>
                          )}
                          {activity.status === 'upcoming' && (
                            isRegistered(activity) ? (
                              <button onClick={() => handleCancelFromCard(activity)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs hover:bg-orange-100 transition-colors"><LogOut className="w-3 h-3" />取消报名</button>
                            ) : (
                              <button onClick={() => handleRegisterFromCard(activity)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs hover:bg-green-100 transition-colors"><CheckCircle className="w-3 h-3" />立即报名</button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* 创建活动弹窗 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">发布活动</h2>
                <button onClick={() => { setShowCreateModal(false); setEditorContent(''); setOrganizers([]); setCoverImage(''); setCoverImagePreview(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={async e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = editorContent;
                const location = (form.elements.namedItem('location') as HTMLInputElement).value;
                const start_time = (form.elements.namedItem('start_time') as HTMLInputElement).value;
                const end_time = (form.elements.namedItem('end_time') as HTMLInputElement).value;
                const max_participants = (form.elements.namedItem('max_participants') as HTMLInputElement).value;
                if (!title.trim()) { alert('请填写活动标题'); return; }
                const userId = user?.id;
                if (!userId) { alert('请先登录'); return; }
                setSubmitting(true);
                try {
                  const payload = { userId, title, description, location, start_time, end_time, max_participants: parseInt(max_participants) || 50, organizer_ids: organizers.map(o => o.id), cover_image: coverImage || null, is_paid: isPaid, price: isPaid ? (parseFloat(price) || 0) : null, community_id: selectedCommunityId || null };
                  console.log('[活动发布] 发送请求:', payload);
                  const response = await fetch('/api/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                  console.log('[活动发布] 响应状态:', response.status, response.statusText);
                  const text = await response.text();
                  console.log('[活动发布] 响应原文:', text);
                  let data; try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }
                  console.log('[活动发布] 解析数据:', data);
                  if (data.success) {
                    const newId = data.id || data.activity?.id;
                    setCreatedActivityId(newId);
                    setShowCreateModal(false);
                    setEditorContent('');
                    setOrganizers([]);
                    setCoverImage('');
    setIsPaid(false);
    setPrice('');
                    setCoverImagePreview('');
                    setSuccessMsg('发布成功！');
                    setTimeout(() => setSuccessMsg(''), 3000);
                    fetchActivities();
                  } else {
                    alert('发布失败：' + (data.error || '未知错误'));
                  }
                } catch (err: any) {
                  console.error('[活动发布] 异常:', err);
                  alert('网络错误：' + (err?.message || '请检查网络后重试'));
                } finally { setSubmitting(false); }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">活动标题 <span className="text-red-500">*</span></label>
                    <input name="title" required placeholder="请输入活动标题" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">组织者</label>
                    <UserSelect onSelect={handleOrganizerSelect} selectedUsers={organizers} placeholder="搜索组织者..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">共同体组织（选填）</label>
                    <select value={selectedCommunityId} onChange={e => setSelectedCommunityId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600">
                      <option value="">选择共同体（个人组织者无需选择）</option>
                      {communities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">是否收费</label>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => { setIsPaid(false); setPrice(''); }}
                        className={`px-4 py-2 rounded-lg text-sm ${!isPaid ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>免费</button>
                      <button type="button" onClick={() => setIsPaid(true)}
                        className={`px-4 py-2 rounded-lg text-sm ${isPaid ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>收费</button>
                    </div>
                  </div>
                  {isPaid && (
                    <div>
                      <label className="block text-sm font-medium mb-1">金额（元）</label>
                      <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="请输入金额" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">开始时间</label>
                      <input name="start_time" type="datetime-local" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">结束时间</label>
                      <input name="end_time" type="datetime-local" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">人数上限</label>
                    <input name="max_participants" type="number" min="1" defaultValue="50" placeholder="请输入人数上限" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">活动地点</label>
                    <input name="location" placeholder="请输入活动地点（支持输入详细地址）" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  {/* 封面图片 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">封面图片</label>
                    {coverImagePreview ? (
                      <div className="relative rounded-lg overflow-hidden">
                        <img src={coverImagePreview} alt="封面预览" className="w-full h-40 object-cover" />
                        <button
                          type="button"
                          onClick={handleRemoveCoverImage}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <Image className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">点击上传封面图片</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverImageUpload} />
                      </label>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">活动描述</label>
                      <AIWriter
                        onResult={(text) => setEditorContent(text)}
                        prompt="请为活动撰写一段吸引人的介绍，包括活动亮点、参与价值、适合人群。要求语言有感染力、真实可信。"
                        label="AI 活动介绍"
                        buttonText="AI 写活动介绍"
                      />
                    </div>
                    <RichTextEditor placeholder="请输入活动描述，支持富文本格式，可插入图片..." value={editorContent} onChange={setEditorContent} />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => { setShowCreateModal(false); setEditorContent(''); setOrganizers([]); setCoverImage(''); setCoverImagePreview(''); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">取消</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? '发布中...' : '发布'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 活动详情弹窗 */}
        <AnimatePresence>
          {detailActivity && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={closeDetail}
            >
              <WeChatShareSetup title={detailActivity.title} description={detailActivity.description?.replace(/<[^>]*>/g, '').slice(0, 200)} imageUrl={detailActivity.cover_image || ''} link={window.location.origin + '/activities?view=' + detailActivity.id} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative"
                onClick={e => e.stopPropagation()}
              >
                {/* 关闭按钮 */}
                <button onClick={closeDetail} className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg z-10">
                  <X className="w-5 h-5" />
                </button>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
                ) : (
                  <>
                    {/* 封面 */}
                    <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl flex items-center justify-center mb-4 relative">
                      {detailActivity.cover_image ? (
                        <img src={detailActivity.cover_image} alt={detailActivity.title} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <Calendar className="w-16 h-16 text-purple-400" />
                      )}
                      <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(detailActivity.status || 'upcoming')}`}>
                        {getStatusLabel(detailActivity.status || 'upcoming')}
                      </span>
                    </div>

                    {/* 标题 */}
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{detailActivity.title}</h2>

                    {/* 活动ID */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs font-mono font-medium">
                        ID: {getShortActivityId(detailActivity.id)}
                      </span>
                    </div>

                    {/* 信息 */}
                    <div className="space-y-3 mb-4 text-sm text-slate-600 dark:text-slate-400">
                      {(detailActivity.organizer_name_selected || detailActivity.organizer_name) && (
                        <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>组织者：{detailActivity.organizer_name_selected || detailActivity.organizer_name}</span></div>
                      )}
                      {detailActivity.location && (
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{detailActivity.location}</span></div>
                      )}
                      {detailActivity.start_time && (
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>开始：{fmtDate(detailActivity.start_time)}</span></div>
                      )}
                      {detailActivity.end_time && (
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>结束：{fmtDate(detailActivity.end_time)}</span></div>
                      )}
                      {detailActivity.max_participants && (
                        <div className="flex items-center gap-2"><Users className="w-4 h-4" /><span>报名：{detailActivity.current_participants || 0} / {detailActivity.max_participants} 人</span></div>
                      )}
                    </div>

                    {/* 描述 */}
                    {detailActivity.description && (
                      <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mb-6">
                        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">活动详情</h3>
                        <div className="text-sm text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: detailActivity.description }} />
                      </div>
                    )}

                    {/* 发布人专属操作：编辑和删除（始终可见） */}
                    {user && String(detailActivity.user_id) === String(user?.id) && (
                      <div className="flex gap-2 border-t border-slate-100 dark:border-slate-700 pt-4 mb-2">
                        <button onClick={() => { closeDetail(); openEdit(detailActivity); }}
                          className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                          <Edit className="w-4 h-4" />编辑活动
                        </button>
                        <button onClick={() => confirmDelete(detailActivity)}
                          disabled={deleting}
                          className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                          <Trash2 className="w-4 h-4" />删除活动
                        </button>
                      </div>
                    )}

                    {/* 报名状态 */}
                    {user && detailActivity.status === 'upcoming' && (
                      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                        {/* 我是组织成员（不是发布人） */}
                        {isOrganizerMember(detailActivity) ? (
                          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm py-2">
                            <User className="w-4 h-4" />您是此活动的组织成员
                          </div>
                        ) : detailActivity.my_registration_status === 'registered' ? (
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="w-5 h-5" />您已报名此活动</span>
                            <button onClick={async () => { await handleCancelRegister(); if (detailActivity) setDetailActivity({ ...detailActivity, my_registration_status: undefined }); }}
                              className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm hover:bg-orange-100 transition-colors">
                              取消报名
                            </button>
                          </div>
                        ) : (
                          <button onClick={async () => { await handleRegister(); if (detailActivity) setDetailActivity({ ...detailActivity, my_registration_status: 'registered' }); }}
                            className="w-full px-4 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors">
                            立即报名
                          </button>
                        )}
                      </div>
                    )}
                    {!user && detailActivity.status === 'upcoming' && (
                      <p className="text-center text-slate-500 text-sm">登录后可报名此活动</p>
                    )}

                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 编辑活动弹窗 */}
        {editingActivity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">编辑活动</h2>
                <button onClick={() => setEditingActivity(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">活动标题 <span className="text-red-500">*</span></label>
                    <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required placeholder="请输入活动标题" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">开始时间</label>
                      <input value={editForm.start_time} onChange={e => setEditForm({ ...editForm, start_time: e.target.value })} type="datetime-local" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">结束时间</label>
                      <input value={editForm.end_time} onChange={e => setEditForm({ ...editForm, end_time: e.target.value })} type="datetime-local" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">人数上限</label>
                    <input value={editForm.max_participants} onChange={e => setEditForm({ ...editForm, max_participants: e.target.value })} type="number" min="1" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">活动地点</label>
                    <input value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} placeholder="请输入活动地点" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">活动描述</label>
                      <AIWriter
                        onResult={(text) => setEditForm({ ...editForm, description: text })}
                        prompt="请为活动撰写一段吸引人的介绍，包括活动亮点、参与价值、适合人群。要求语言有感染力、真实可信。"
                        context={`活动标题：${editForm.title}，时间：${editForm.start_time}，地点：${editForm.location}`}
                        label="AI 活动介绍"
                        buttonText="AI 写活动介绍"
                      />
                    </div>
                    <RichTextEditor placeholder="请输入活动描述..." value={editForm.description} onChange={v => setEditForm({ ...editForm, description: v })} />
                  </div>
                  {/* 封面图片 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">封面图片</label>
                    {coverImagePreview ? (
                      <div className="relative rounded-lg overflow-hidden">
                        <img src={coverImagePreview} alt="封面预览" className="w-full h-40 object-cover" />
                        <button
                          type="button"
                          onClick={() => { setCoverImage(''); setCoverImagePreview(''); }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                        <Image className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">点击上传封面图片</span>
                        <input type="file" accept="image/*" className="hidden" onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => setCoverImagePreview(ev.target?.result as string);
                          reader.readAsDataURL(file);
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (data.success && data.url) {
                              setCoverImage(data.url);
                            } else {
                              alert('上传失败：' + (data.error || '未知错误'));
                            }
                          } catch (err) {
                            console.error('上传图片失败:', err);
                            alert('上传失败，请重试');
                          }
                        }} />
                      </label>
                    )}
                  </div>
                  {/* 是否收费 */}
                  <div>
                    <label className="block text-sm font-medium mb-1">是否收费</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsPaid(false)}
                        className={`px-4 py-2 rounded-lg text-sm ${!isPaid ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>免费</button>
                      <button type="button" onClick={() => setIsPaid(true)}
                        className={`px-4 py-2 rounded-lg text-sm ${isPaid ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>收费</button>
                    </div>
                  </div>
                  {/* 金额 */}
                  {isPaid && (
                    <div>
                      <label className="block text-sm font-medium mb-1">金额（元）</label>
                      <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="请输入金额" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setEditingActivity(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">取消</button>
                  <button type="submit" disabled={editSubmitting} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    {editSubmitting ? '保存中...' : '保存修改'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
