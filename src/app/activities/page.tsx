"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, MapPin, Users, Clock, Search, Loader2, X, User, Edit, Trash2, CheckCircle, LogOut, ChevronRight, Image, Copy } from 'lucide-react';
import Layout from '@/components/Layout';
import RichTextEditor from '@/components/RichTextEditor';
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
  status?: string;
  user_id?: string;
  my_registration_status?: string;
  is_organizer_member?: number | boolean;
}

export default function ActivitiesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 全部、我组织的、我报名的
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [organizers, setOrganizers] = useState<UserSearchResult[]>([]);
  const [coverImage, setCoverImage] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdActivityId, setCreatedActivityId] = useState<string | null>(null);

  // 详情弹窗
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 编辑弹窗
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', location: '', start_time: '', max_participants: '' });
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 生成简短的活动 ID（显示用）
  const getShortActivityId = (id: string) => {
    return 'ACT' + id.replace(/-/g, '').slice(0, 8).toUpperCase();
  };

  // 详情弹窗 - 加载活动详情
  const openDetail = async (activity: Activity) => {
    setDetailActivity(activity);
    if (user?.id) {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/activities/${activity.id}?userId=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setDetailActivity({ ...data.activity, my_registration_status: data.registration?.status, is_organizer_member: data.activity.is_organizer_member });
        }
      } catch (e) { /* ignore */ }
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailActivity(null);
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

  // 删除活动
  const handleDelete = async (activity: Activity): Promise<boolean> => {
    console.log('[删除活动] 开始', activity.id, activity.title);
    if (!user?.id) { console.log('[删除活动] 未登录'); return false; }
    if (!confirm(`确定要删除活动「${activity.title}」吗？`)) { console.log('[删除活动] 用户取消'); return false; }
    console.log('[删除活动] 确认删除, 发送请求');
    try {
      const res = await fetch(`/api/activities/${activity.id}?userId=${user.id}`, { method: 'DELETE' });
      console.log('[删除活动] 响应状态:', res.status);
      const data = await res.json();
      console.log('[删除活动] 响应数据:', data);
      if (data.success) {
        setSuccessMsg('删除成功');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchActivities();
        return true;
      } else {
        setErrorMsg(data.error || '删除失败');
        setTimeout(() => setErrorMsg(''), 4000);
        return false;
      }
    } catch (e) {
      console.error('[删除活动] 异常:', e);
      setErrorMsg('网络错误，请重试');
      setTimeout(() => setErrorMsg(''), 4000);
      return false;
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
      max_participants: activity.max_participants?.toString() || '50',
    });
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
          max_participants: parseInt(editForm.max_participants) || null,
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
    reader.onload = (ev) => {
      setCoverImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 上传到服务器
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
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
    setCoverImagePreview('');
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (typeFilter === 'organized') params.set('organized', 'true');
      if (typeFilter === 'joined') params.set('joined', 'true');
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
      upcoming: '即将开始', ongoing: '进行中', completed: '已结束', cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-700', ongoing: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700',
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
                onClick={(e) => e.stopPropagation()}
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
            <select value={filter} onChange={(e) => { setFilter(e.target.value); fetchActivities(); }}
              className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
              <option value="">全部状态</option>
              <option value="upcoming">即将开始</option>
              <option value="ongoing">进行中</option>
              <option value="completed">已结束</option>
            </select>
          </div>
          <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
            {[['all', '全部'], ['organized', '我组织的'], ['joined', '我报名的']].map(([v, label]) => (
              <button key={v} onClick={() => { setTypeFilter(v); fetchActivities(); }}
                className={`px-4 py-2 rounded-t-lg transition-colors ${typeFilter === v ? 'bg-purple-500 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {label}
              </button>
            ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => openDetail(activity)}
                >
                  <div className="h-40 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center relative">
                    {activity.cover_image ? (
                      <img src={activity.cover_image} alt={activity.title} className="w-full h-full object-cover" />
                    ) : (
                      <Calendar className="w-12 h-12 text-purple-400" />
                    )}
                    {/* 报名状态标签 */}
                    {isRegistered(activity) && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> 已报名
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status || 'upcoming')}`}>
                        {getStatusLabel(activity.status || 'upcoming')}
                      </span>
                      {activity.activity_type && <span className="text-xs text-slate-500">{activity.activity_type}</span>}
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2">{activity.title}</h3>
                    {activity.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2" dangerouslySetInnerHTML={{ __html: activity.description }} />
                    )}
                    <div className="space-y-2 text-sm text-slate-500">
                      {(activity.organizer_name_selected || activity.organizer_name) && (
                        <div className="flex items-center gap-2"><User className="w-4 h-4" />{activity.organizer_name_selected || activity.organizer_name}</div>
                      )}
                      {activity.location && (
                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{activity.location}</div>
                      )}
                      {activity.start_time && (
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{fmtDate(activity.start_time)}</div>
                      )}
                      {activity.max_participants && (
                        <div className="flex items-center gap-2"><Users className="w-4 h-4" />{activity.current_participants || 0} / {activity.max_participants} 人</div>
                      )}
                    </div>
                    {/* 操作按钮 */}
                    {user && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        {/* 我发布的：显示编辑和删除 */}
                        {isMyPublished(activity) && (
                          <>
                            <button onClick={() => openEdit(activity)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors">
                              <Edit className="w-4 h-4" />编辑
                            </button>
                            <button onClick={() => handleDelete(activity)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors">
                              <Trash2 className="w-4 h-4" />删除
                            </button>
                          </>
                        )}
                        {/* 我作为组织成员（但不是我发布的）：不显示任何操作按钮 */}
                        {isOrganizerMember(activity) && !isMyPublished(activity) && (
                          <span className="flex-1 text-center text-xs text-slate-400 py-2">组织成员</span>
                        )}
                        {/* 既不是我发布的也不是组织成员：显示报名/取消报名 */}
                        {!isMyPublished(activity) && !isOrganizerMember(activity) && activity.status === 'upcoming' && (
                          isRegistered(activity) ? (
                            <button onClick={() => handleCancelFromCard(activity)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm hover:bg-orange-100 transition-colors">
                              <LogOut className="w-4 h-4" />取消报名
                            </button>
                          ) : (
                            <button onClick={() => handleRegisterFromCard(activity)}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors">
                              <CheckCircle className="w-4 h-4" />立即报名
                            </button>
                          )
                        )}
                      </div>
                    )}
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
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const title = (form.elements.namedItem('title') as HTMLInputElement).value;
                const description = editorContent;
                const location = (form.elements.namedItem('location') as HTMLInputElement).value;
                const start_time = (form.elements.namedItem('start_time') as HTMLInputElement).value;
                const max_participants = (form.elements.namedItem('max_participants') as HTMLInputElement).value;
                if (!title.trim()) { alert('请填写活动标题'); return; }
                const userId = user?.id;
                if (!userId) { alert('请先登录'); return; }
                setSubmitting(true);
                try {
                  const payload = { userId, title, description, location, start_time, max_participants: parseInt(max_participants) || 50, organizer_ids: organizers.map(o => o.id), cover_image: coverImage || null };
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">开始时间</label>
                      <input name="start_time" type="datetime-local" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">人数上限</label>
                      <input name="max_participants" type="number" min="1" defaultValue="50" placeholder="请输入人数上限" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
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
                    <label className="block text-sm font-medium mb-1">活动描述</label>
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
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative"
                onClick={(e) => e.stopPropagation()}
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

                    {/* 报名状态 */}
                    {user && detailActivity.status === 'upcoming' && (
                      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                        {/* 我发布的：显示编辑和删除 */}
                        {String(detailActivity.user_id) === String(user?.id) ? (
                          <div className="flex gap-2">
                            <button onClick={() => { closeDetail(); openEdit(detailActivity); }}
                              className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                              <Edit className="w-4 h-4" />编辑活动
                            </button>
                            <button onClick={async () => { const ok = await handleDelete(detailActivity); if (ok) closeDetail(); }}
                              className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                              <Trash2 className="w-4 h-4" />删除活动
                            </button>
                          </div>
                        ) : isOrganizerMember(detailActivity) ? (
                          /* 我是组织成员（但不是我发布的）：显示组织成员标签 */
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
                    <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required placeholder="请输入活动标题" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">开始时间</label>
                      <input value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} type="datetime-local" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">人数上限</label>
                      <input value={editForm.max_participants} onChange={(e) => setEditForm({ ...editForm, max_participants: e.target.value })} type="number" min="1" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">活动地点</label>
                    <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="请输入活动地点" className="w-full px-4 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">活动描述</label>
                    <RichTextEditor placeholder="请输入活动描述..." value={editForm.description} onChange={(v) => setEditForm({ ...editForm, description: v })} />
                  </div>
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
