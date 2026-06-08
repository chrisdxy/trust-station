'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import AdminLayout from '../AdminLayout';
import { useCategories } from '@/hooks/useCategories';
import { IndustrySelect } from '@/components/IndustrySelect';
import { UserSelect, UserSearchResult } from '@/components/UserSelect';
import {
  Search, Loader2, CheckCircle2, XCircle, Pin, PinOff, Trash2,
  ExternalLink, ListOrdered, Pencil, X, Upload, Image as ImageIcon
} from 'lucide-react';

type PublishType = 'community' | 'activity' | 'project';

interface PublishItem {
  id: string; name: string; summary?: string; description?: string;
  owner_name?: string; status: string; created_at: string;
  member_count?: number; start_time?: string; max_participants?: number;
  is_pinned?: number; sort_order?: number;
  category?: string; industry?: string; location?: string; types?: string;
}

interface EditForm {
  id: string; name: string; summary: string; description: string;
  category?: string; industry?: string; industryName?: string;
  location?: string; max_participants?: number; types?: string;
  coverImage?: string; qrCode?: string; isPublic?: boolean;
  maxMembers?: number; rules?: string;
  hosts: UserSearchResult[];
}

const typeLabels: Record<PublishType, string> = {
  community: '共同体列表', activity: '活动列表', project: '项目列表'
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: '已发布', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  draft: { label: '草稿', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
  pending: { label: '待审核', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  rejected: { label: '已驳回', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
  inactive: { label: '已下架', color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400' }
};

export default function PublishManagementPage() {
  const [activeTab, setActiveTab] = useState<PublishType>('community');
  const [items, setItems] = useState<PublishItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [searchText, setSearchText] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<{ id: string; order: number } | null>(null);

  // 编辑弹窗
  const [editModal, setEditModal] = useState<{ open: boolean; item: PublishItem | null }>({ open: false, item: null });
  const [editForm, setEditForm] = useState<EditForm>({ id: '', name: '', summary: '', description: '', hosts: [] });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'cover' | 'qr' | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const coverInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const descImageRef = useRef<HTMLInputElement>(null);

  // 分类
  const adminCategories = useCategories();
  const communityCategories = adminCategories.community || [];
  const categoryOptions = communityCategories.length > 0
    ? communityCategories.map((c: any) => ({ value: c.id, label: c.name }))
    : [
        { value: '1', label: '商业合作' }, { value: '2', label: '技术交流' },
        { value: '3', label: '资源共享' }, { value: '4', label: '创业投资' }
      ];

  // Markdown 格式化（与前台一致）
  const formatText = (format: 'bold' | 'italic' | 'list' | 'link') => {
    const textarea = document.getElementById('admin-desc-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    const text = textarea.value, sel = text.substring(start, end);
    let newText = '', off = 0;
    switch (format) {
      case 'bold': newText = `**${sel}**`; off = 2; break;
      case 'italic': newText = `*${sel}*`; off = 1; break;
      case 'list': newText = `\n- ${sel}`; off = 3; break;
      case 'link': newText = `[${sel}](url)`; off = 1; break;
    }
    setEditForm(f => ({ ...f, description: text.substring(0, start) + newText + text.substring(end) }));
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + off, start + off + sel.length); }, 0);
  };

  const handleDescImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) { alert('上传失败: ' + (res.status === 413 ? '图片过大' : '服务器错误')); return; }
      const d = await res.json();
      if (d.success) setEditForm(f => ({ ...f, description: f.description + `\n![${file.name}](${d.url})\n` }));
      else alert('上传失败: ' + (d.error || '未知错误'));
    } catch { alert('上传失败，请重试'); }
    if (descImageRef.current) descImageRef.current.value = '';
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading('cover');
    const reader = new FileReader();
    reader.onload = ev => setCoverPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) { alert('封面上传失败: ' + (res.status === 413 ? '图片过大' : '服务器错误')); setUploading(null); return; }
    const d = await res.json();
    if (d.success) setEditForm(f => ({ ...f, coverImage: d.url }));
    else alert('封面上传失败: ' + (d.error || '未知错误'));
    setUploading(null);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading('qr');
    const reader = new FileReader();
    reader.onload = ev => setEditForm(f => ({ ...f, qrCode: ev.target?.result as string }));
    reader.readAsDataURL(file);
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) { alert('二维码上传失败: ' + (res.status === 413 ? '图片过大' : '服务器错误')); setUploading(null); return; }
    const d = await res.json();
    if (d.success) setEditForm(f => ({ ...f, qrCode: d.url }));
    else alert('二维码上传失败: ' + (d.error || '未知错误'));
    setUploading(null);
  };

  // 获取发布列表
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeTab });
      if (searchText) params.set('keyword', searchText);
      const res = await fetch(`/api/admin/publish?${params}`);
      const data = await res.json();
      if (data.success) setItems(data.items || []);
    } catch (err) { console.error('获取失败:', err); }
    finally { setLoading(false); }
  }, [activeTab, searchText]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // 打开编辑
  const openEdit = (item: PublishItem) => {
    const a = item as any;
    setEditForm({
      id: item.id, name: item.name || '', summary: item.summary || '', description: a.description || '',
      category: a.category || '', industry: a.industry || '', industryName: a.industryName || '',
      location: a.location || '', max_participants: a.max_participants || 0, types: a.types || '',
      coverImage: a.coverImage || a.cover_image || '', qrCode: a.qrCode || a.qr_code || '',
      isPublic: a.isPublic !== undefined ? !!a.isPublic : true,
      maxMembers: a.maxMembers || 0, rules: a.rules || '',
      hosts: a.hosts || []
    });
    setCoverPreview('');
    setEditModal({ open: true, item });
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) { alert('名称不能为空'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editForm.id, type: activeTab, action: 'edit',
          name: editForm.name, summary: editForm.summary, description: editForm.description,
          category: editForm.category, industry: editForm.industry,
          coverImage: editForm.coverImage, qrCode: editForm.qrCode,
          isPublic: editForm.isPublic,
          maxMembers: editForm.maxMembers, rules: editForm.rules,
          location: editForm.location, max_participants: editForm.max_participants
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('保存失败响应:', res.status, errText.substring(0, 500));
        alert('保存失败: ' + (res.status === 413 ? '文件过大，请缩小图片后重试' : '服务器错误 ' + res.status));
        return;
      }
      const data = await res.json();
      if (data.success) { setEditModal({ open: false, item: null }); fetchItems(); }
      else alert(data.error || '保存失败');
    } catch { alert('保存失败'); }
    finally { setSaving(false); }
  };

  const handleAction = async (id: string, action: string, sortOrder?: number) => {
    setActionLoading(id + action);
    try {
      const body: any = { id, type: activeTab, action };
      if (sortOrder) body.sortOrder = sortOrder;
      const res = await fetch('/api/admin/publish', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) fetchItems(); else alert(data.error || '操作失败');
    } catch { alert('操作失败'); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id + 'delete');
    try {
      const res = await fetch(`/api/admin/publish?id=${id}&type=${activeTab}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { setDeleteConfirm(null); fetchItems(); } else alert(data.error || '删除失败');
    } catch { alert('删除失败'); }
    finally { setActionLoading(null); }
  };

  const getStatusBadge = (status: string) => {
    const s = statusLabels[status] || { label: status, color: 'text-slate-600 bg-slate-100' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
  };
  const isPinned = (item: PublishItem) => item.sort_order && item.sort_order > 0;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <ListOrdered className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">发布管理</h1>
            <p className="text-sm text-slate-500">管理所有内容的发布、审核、编辑、置顶</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="搜索名称或描述..." value={keyword}
              onChange={e => setKeyword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setSearchText(keyword); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm" />
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 pb-3">
          {(Object.entries(typeLabels) as [PublishType, string][]).map(([key, label]) => (
            <button key={key} onClick={() => { setActiveTab(key); setSearchText(''); setKeyword(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === key ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无内容</div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isPinned(item) && <Pin className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />}
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name || item.id.slice(0, 8)}</h3>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {item.owner_name && <span>创建者: {item.owner_name}</span>}
                      {item.member_count !== undefined && <span>{item.member_count} 成员</span>}
                      <span>{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                    {item.summary && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{item.summary}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="编辑"><Pencil className="w-4 h-4" /></button>
                    <a href={`/${activeTab === 'community' ? 'communities' : activeTab === 'activity' ? 'activities' : 'projects'}?id=${item.id}`} target="_blank" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="查看"><ExternalLink className="w-4 h-4" /></a>
                    {item.status !== 'active' && (
                      <button onClick={() => handleAction(item.id, 'approve')} disabled={actionLoading === item.id + 'approve'} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="审核通过">
                        {actionLoading === item.id + 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    )}
                    {item.status !== 'rejected' && item.status !== 'inactive' && (
                      <button onClick={() => handleAction(item.id, 'reject')} disabled={actionLoading === item.id + 'reject'} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="驳回">
                        {actionLoading === item.id + 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      </button>
                    )}
                    {isPinned(item) ? (
                      <div className="flex items-center gap-1">
                        <Pin className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600 min-w-[1.5em] text-center">{item.sort_order}</span>
                        <button onClick={() => setPinModal({ id: item.id, order: item.sort_order || 1 })} className="p-1 text-slate-400 hover:text-amber-500 rounded transition-colors" title="修改序号"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleAction(item.id, 'unpin', item.sort_order)} className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors" title="取消置顶"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => handleAction(item.id, 'pin')} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors" title="置顶">
                        {actionLoading === item.id + 'pin' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pin className="w-4 h-4" />}
                      </button>
                    )}
                    {deleteConfirm === item.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(item.id)} className="px-2 py-1 bg-red-500 text-white text-xs rounded">确认</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 bg-slate-200 text-xs rounded">取消</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="删除"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== 编辑弹窗（与前台创建表单完全一致） ===== */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setEditModal({ open: false, item: null })}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">编辑内容</h2>
              <button onClick={() => setEditModal({ open: false, item: null })} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* 1. 名称 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">名称 *</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white" />
              </div>

              {/* 2. 简介 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">简介</label>
                <textarea value={editForm.summary} rows={2} onChange={e => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none" />
              </div>

              {/* 3. 分类选择（radio网格） */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">分类</label>
                {categoryOptions.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {categoryOptions.map(opt => (
                      <label key={opt.value} className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer text-sm ${editForm.category === opt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'}`}>
                        <input type="radio" name="admin-cat" value={opt.value} checked={editForm.category === opt.value}
                          onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="sr-only" />{opt.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. 行业选择 */}
              <IndustrySelect value={editForm.industry || ''} onChange={id => setEditForm({ ...editForm, industry: id })} placeholder="请选择行业" inline={true} />

              {/* 6. 封面图片 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">封面图片</label>
                <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                <div className="flex items-center gap-3">
                  {(coverPreview || editForm.coverImage) ? (
                    <div className="relative w-24 h-24">
                      <img src={coverPreview || editForm.coverImage} alt="封面" className="w-24 h-24 object-cover rounded-lg border" />
                      <button onClick={() => { setCoverPreview(''); setEditForm(f => ({ ...f, coverImage: '' })); }} className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'}
                    className="px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 hover:border-amber-400 transition-colors flex items-center gap-2">
                    {uploading === 'cover' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}上传封面
                  </button>
                </div>
              </div>

              {/* 7. 描述（Markdown编辑器 + 工具栏） */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">介绍</label>
                <div className="flex items-center gap-1 mb-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <button type="button" onClick={() => formatText('bold')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-sm font-bold" title="加粗">B</button>
                  <button type="button" onClick={() => formatText('italic')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-sm italic" title="斜体">I</button>
                  <span className="w-px h-4 bg-slate-300 mx-1" />
                  <button type="button" onClick={() => formatText('list')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-sm" title="列表">List</button>
                  <button type="button" onClick={() => { const url = prompt('请输入链接地址:', 'https://'); if (url) { const ta = document.getElementById('admin-desc-editor') as HTMLTextAreaElement; if (ta) { const sel = ta.value.substring(ta.selectionStart, ta.selectionEnd); setEditForm(f => ({ ...f, description: ta.value.substring(0, ta.selectionStart) + (sel ? `[${sel}](${url})` : `[链接](${url})`) + ta.value.substring(ta.selectionEnd) })); } } }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-sm" title="链接">Link</button>
                  <button type="button" onClick={() => descImageRef.current?.click()} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-sm flex items-center gap-1" title="图片"><ImageIcon className="w-3.5 h-3.5" /></button>
                  <input ref={descImageRef} type="file" accept="image/*" onChange={handleDescImageUpload} className="hidden" />
                </div>
                <textarea id="admin-desc-editor" value={editForm.description} rows={7} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none font-mono text-sm"
                  placeholder="支持 Markdown：**加粗** *斜体* [链接](url) ![图片](url)" />
                {/* 预览区 */}
                {editForm.description && (
                  <div className="mt-3 p-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800">
                    <p className="text-xs text-slate-400 mb-2">预览</p>
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {editForm.description.split('\n').map((line, i) => {
                        // 图片行 ![alt](url)
                        const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                        if (imgMatch) {
                          return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full h-auto my-2 rounded-lg" />;
                        }
                        // 粗体
                        let html = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                        // 斜体
                        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                        // 链接
                        html = html.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-500 underline">$1</a>');
                        if (!html.trim()) return null;
                        return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: html }} />;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 8. 组织发起人 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">组织发起人</label>
                <UserSelect
                  selectedUsers={editForm.hosts}
                  onSelect={user => {
                    if (!editForm.hosts.find(h => h.id === user.id)) {
                      setEditForm({ ...editForm, hosts: [...editForm.hosts, user] });
                    }
                  }}
                  onRemove={userId => setEditForm({ ...editForm, hosts: editForm.hosts.filter(h => h.id !== userId) })}
                />
              </div>

              {/* 9. 社群二维码 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">社群二维码</label>
                <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                <div className="flex items-center gap-3">
                  {editForm.qrCode ? (
                    <div className="relative w-20 h-20">
                      <img src={editForm.qrCode} alt="二维码" className="w-20 h-20 object-cover rounded-lg border" />
                      <button onClick={() => setEditForm(f => ({ ...f, qrCode: '' }))} className="absolute -top-2 -right-2 p-0.5 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                    </div>
                  ) : null}
                  <button type="button" onClick={() => qrInputRef.current?.click()} disabled={uploading === 'qr'}
                    className="px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 hover:border-amber-400 transition-colors flex items-center gap-2">
                    {uploading === 'qr' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}上传二维码
                  </button>
                </div>
              </div>

              {/* 10. 公开/私密 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">可见范围</label>
                <div className="flex gap-4">
                  {['公开', '私密'].map(t => (
                    <label key={t} className={`flex items-center justify-center px-4 py-2 border rounded-lg cursor-pointer text-sm ${(t === '公开' && editForm.isPublic) || (t === '私密' && !editForm.isPublic) ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-600' : 'border-slate-200 dark:border-slate-600'}`}>
                      <input type="radio" name="admin-vis" checked={(t === '公开' && editForm.isPublic) || (t === '私密' && !editForm.isPublic)}
                        onChange={() => setEditForm({ ...editForm, isPublic: t === '公开' })} className="sr-only" />{t}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800">
              <button onClick={() => setEditModal({ open: false, item: null })} className="px-6 py-2.5 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">取消</button>
              <button onClick={handleSaveEdit} disabled={saving} className="px-6 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 置顶序号弹窗 ===== */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setPinModal(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">设置置顶序号</h3>
            <input id="pin-modal-input" type="number" min={1} max={99} defaultValue={pinModal.order} autoFocus
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
              onKeyDown={e => { if (e.key === 'Enter') { const val = parseInt((e.target as HTMLInputElement).value); if (val && val !== pinModal.order) handleAction(pinModal.id, 'pin', val); setPinModal(null); } }}
              placeholder="输入序号" />
            <p className="text-xs text-slate-400 mt-2 text-center">输入 1-99，回车确认</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setPinModal(null)} className="flex-1 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">取消</button>
              <button onClick={() => { const input = document.querySelector('#pin-modal-input') as HTMLInputElement; const val = parseInt(input?.value || ''); if (val && val !== pinModal.order) handleAction(pinModal.id, 'pin', val); setPinModal(null); }} className="flex-1 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl">确定</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
