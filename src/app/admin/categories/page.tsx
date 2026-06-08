"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Plus, Edit, Trash2, X, Loader2, Save, Check, Square, Trash, SortAsc, Upload } from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { refreshAllCategories } from '@/hooks/useCategories';
import { IndustryCategoryView } from '@/components/IndustryCategoryView';

type CategoryType = 'community' | 'project_industry' | 'project_type' | 'activity' | 'cooperation' | 'partner_level' | 'record_type' | 'ai_tool';

interface Category {
  id: string;
  type: string;
  name: string;
  description?: string;
  sort_order?: number;
  status?: string;
  parent_id?: string | null;
}

interface CategoryConfig {
  type: CategoryType;
  label: string;
  color: string;
}

const categoryConfigs: CategoryConfig[] = [
  { type: 'community', label: '共同体分类', color: 'bg-blue-500' },
  { type: 'project_industry', label: '行业', color: 'bg-purple-500' },
  { type: 'project_type', label: '项目类型', color: 'bg-amber-500' },
  { type: 'activity', label: '活动类型', color: 'bg-green-500' },
  { type: 'cooperation', label: '合作类型', color: 'bg-rose-500' },
  { type: 'record_type', label: '记录类型', color: 'bg-orange-500' },
  { type: 'partner_level', label: '合伙人类型', color: 'bg-cyan-500' },
  { type: 'ai_tool', label: 'AI工具分类', color: 'bg-indigo-500' },
];

export default function CategoriesPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>('community');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Category>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 批量操作相关
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [batchSortOrder, setBatchSortOrder] = useState('');
  const [batchOperation, setBatchOperation] = useState<'delete' | 'sort' | null>(null);
  
  // 批量添加相关
  const [batchAddItems, setBatchAddItems] = useState<{name: string, sortOrder: string}[]>([
    { name: '', sortOrder: '' }
  ]);

  // 批量导入相关（行业专用）
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  
  // 新增一级分类（行业专用）
  const [showNewParentForm, setShowNewParentForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySortOrder, setNewCategorySortOrder] = useState('');

  // ========== 缓存同步（跨标签页通知） ==========
  // 将当前类型的分类写入 localStorage，通知其他标签页刷新
  const saveToCache = useCallback(() => {
    if (categories.length === 0) return;
    try {
      const cached = localStorage.getItem('admin_categories');
      const parsed = cached ? JSON.parse(cached) : {};
      parsed[activeCategory] = categories.map(c => ({
        id: String(c.id),
        name: c.name,
      }));
      localStorage.setItem('admin_categories', JSON.stringify(parsed));
    } catch (_) { /* ignore */ }
  }, [categories, activeCategory]);

  // categories 变化时自动写入缓存
  useEffect(() => {
    saveToCache();
  }, [saveToCache]);

  // 供操作后手动刷新其他标签页
  const notifyOtherTabs = () => {
    saveToCache();
    try { refreshAllCategories(); } catch (_) {}
  };
  // ===================================================

  // 二级分类展开状态
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  
  // 处理一级分类点击展开
  const toggleExpand = (parentId: string) => {
    const newSet = new Set(expandedParents);
    if (newSet.has(parentId)) {
      newSet.delete(parentId);
    } else {
      newSet.add(parentId);
    }
    setExpandedParents(newSet);
  };

  useEffect(() => {
    fetchCategories();
  }, [activeCategory]);

  // 切换分类类型时清空选择
  useEffect(() => {
    setSelectedIds(new Set());
    setBatchMode(false);
    setBatchOperation(null);
  }, [activeCategory]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/categories?type=${activeCategory}`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      } else {
        console.error('获取分类失败:', data.error);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 批量导入处理（行业专用）- 支持一级和二级分类
  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) return;

    setSaving(true);
    try {
      const lines = bulkImportText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

      // 获取现有分类，用于查重
      const existingResp = await fetch(`/api/admin/categories?type=${activeCategory}`);
      const existingData = await existingResp.json();
      const existingCategories = existingData.success ? existingData.categories : [];

      // 构建现有分类的映射
      const parentIdMap = new Map<string, number>();
      const existingParents = new Set<string>();
      const existingChildren = new Set<string>(); // 格式: "parentName-childName"

      existingCategories.forEach((cat: any) => {
        if (!cat.parent_id) {
          // 一级分类
          parentIdMap.set(cat.name, cat.id);
          existingParents.add(cat.name);
        } else {
          // 二级分类
          const parent = existingCategories.find((p: any) => p.id === cat.parent_id);
          if (parent) {
            existingChildren.add(`${parent.name}-${cat.name}`);
          }
        }
      });

      const parentCategories: { name: string; sortOrder: number }[] = [];
      const childCategories: { name: string; parentName: string; sortOrder: number }[] = [];

      // 解析每一行
      let currentParent = '';
      for (const line of lines) {
        if (line.includes(':')) {
          // 格式：一级分类:二级分类1,二级分类2
          const [parentName, childrenStr] = line.split(':').map(s => s.trim());
          if (parentName) {
            currentParent = parentName;

            // 如果一级分类不存在，添加到待创建列表
            if (!existingParents.has(parentName)) {
              parentCategories.push({ name: parentName, sortOrder: parentCategories.length + 1 });
            }

            // 解析二级分类
            if (childrenStr) {
              const children = childrenStr.split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0);
              children.forEach((childName, index) => {
                // 如果二级分类不存在，添加到待创建列表
                if (!existingChildren.has(`${parentName}-${childName}`)) {
                  childCategories.push({
                    name: childName,
                    parentName,
                    sortOrder: index + 1
                  });
                }
              });
            }
          }
        } else if (line.startsWith('-') || line.startsWith('–') || line.startsWith('·')) {
          // 格式： - 二级分类名（需要前面有一级分类）
          const childName = line.replace(/^[-–·]\s*/, '').trim();
          if (childName && currentParent) {
            if (!existingChildren.has(`${currentParent}-${childName}`)) {
              childCategories.push({
                name: childName,
                parentName: currentParent,
                sortOrder: childCategories.filter(c => c.parentName === currentParent).length + 1
              });
            }
          }
        } else if (line.length > 0) {
          // 纯一级分类名
          currentParent = line;
          if (!existingParents.has(line)) {
            parentCategories.push({ name: line, sortOrder: parentCategories.length + 1 });
          }
        }
      }

      // 1. 先创建一级分类
      for (const parent of parentCategories) {
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: activeCategory,
            name: parent.name,
            sort_order: parent.sortOrder,
            parent_id: null
          }),
        });
        const data = await response.json();
        if (data.success && data.id) {
          parentIdMap.set(parent.name, data.id);
        }
      }

      // 2. 再创建二级分类
      for (const child of childCategories) {
        const parentId = parentIdMap.get(child.parentName);
        if (parentId) {
          await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: activeCategory,
              name: child.name,
              sort_order: child.sortOrder,
              parent_id: parentId
            }),
          });
        }
      }

      setShowBulkImport(false);
      setBulkImportText('');
      fetchCategories();
      notifyOtherTabs();
      alert(`成功导入 ${parentCategories.length} 个一级分类和 ${childCategories.length} 个二级分类`);
    } catch (error) {
      console.error('批量导入分类失败:', error);
      alert('导入失败，请检查格式是否正确');
    } finally {
      setSaving(false);
    }
  };

  // 批量添加分类
  const handleBatchAdd = async () => {
    const validItems = batchAddItems.filter(item => item.name.trim());
    if (validItems.length === 0) {
      alert('请输入至少一个分类名称');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/categories/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeCategory,
          items: validItems.map((item, index) => ({
            name: item.name.trim(),
            sortOrder: item.sortOrder ? parseInt(item.sortOrder) : index + categories.length + 1
          }))
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setShowAddForm(false);
        setBatchAddItems([{ name: '', sortOrder: '' }]);
        // 添加后重新获取数据
        await fetchCategories();
        notifyOtherTabs();
        alert(data.message || `成功添加 ${validItems.length} 个分类`);
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('批量添加分类失败:', error);
      alert('添加失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个分类吗？`)) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds)
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedIds(new Set());
        setBatchMode(false);
        fetchCategories();
        notifyOtherTabs();
      }
    } catch (error) {
      console.error('批量删除分类失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 批量修改序号
  const handleBatchUpdateSort = async () => {
    if (selectedIds.size === 0 || !batchSortOrder) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/admin/categories/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          sortOrder: parseInt(batchSortOrder)
        }),
      });
      const data = await response.json();
      if (data.success) {
        setBatchSortOrder('');
        setBatchOperation(null);
        setSelectedIds(new Set());
        setBatchMode(false);
        fetchCategories();
        notifyOtherTabs();
      }
    } catch (error) {
      console.error('批量修改序号失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 单个删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个分类吗？')) return;
    try {
      const response = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        fetchCategories();
        notifyOtherTabs();
      }
    } catch (error) {
      console.error('删除分类失败:', error);
    }
  };

  // 单个更新
  const handleUpdate = async () => {
    if (!editingId || !editForm.name?.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...editForm,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEditingId(null);
        setEditForm({});
        fetchCategories();
        notifyOtherTabs();
      }
    } catch (error) {
      console.error('更新分类失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 新增子类
  const handleAddChild = async (parentId: string, name: string, sortOrder: number) => {
    console.log('[handleAddChild] 开始添加子类:', { parentId, name, sortOrder, type: activeCategory });
    setSaving(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeCategory,
          name,
          sort_order: sortOrder,
          parent_id: parentId,
        }),
      });
      console.log('[handleAddChild] 响应状态:', response.status);
      const data = await response.json();
      console.log('[handleAddChild] 响应数据:', data);
      if (data.success) {
        // 确保父级保持展开
        setExpandedParents(prev => {
          const newSet = new Set(prev);
          newSet.add(parentId);
          return newSet;
        });
        fetchCategories();
        notifyOtherTabs();
        alert('子类添加成功！');
      } else {
        alert(data.error || '添加子分类失败');
      }
    } catch (error) {
      console.error('添加子分类失败:', error);
      alert('添加子分类失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, description: cat.description, sort_order: cat.sort_order });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map(c => c.id)));
    }
  };

  // 选择/取消单个
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const config = categoryConfigs.find(c => c.type === activeCategory);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
              <FolderTree className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">分类管理</h1>
              <p className="text-sm text-slate-500">管理平台内容分类</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {batchMode ? (
              <>
                <span className="text-sm text-slate-500">已选择 {selectedIds.size} 项</span>
                <button
                  onClick={() => { setSelectedIds(new Set()); setBatchMode(false); }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
                >
                  取消
                </button>
              </>
            ) : (
              <button
                onClick={() => setBatchMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                批量操作
              </button>
            )}
            {activeCategory === 'project_industry' && (
              <button
                onClick={() => {
                  setBulkImportText('');
                  setShowBulkImport(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                批量导入
              </button>
            )}
            <button
              onClick={() => {
                if (activeCategory === 'project_industry') {
                  setNewCategoryName('');
                  setNewCategorySortOrder('');
                  setShowNewParentForm(true);
                } else {
                  setBatchAddItems([{ name: '', sortOrder: '' }]);
                  setShowAddForm(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增分类
            </button>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="flex flex-wrap gap-2">
          {categoryConfigs.map((config) => (
            <button
              key={config.type}
              onClick={() => setActiveCategory(config.type)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === config.type
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* 批量操作栏 */}
        {batchMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
          >
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                已选择 {selectedIds.size} 个分类
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBatchOperation('sort')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300"
                >
                  <SortAsc className="w-4 h-4" />
                  批量修改序号
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={saving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                >
                  <Trash className="w-4 h-4" />
                  批量删除
                </button>
              </div>
              
              {batchOperation === 'sort' && (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="number"
                    value={batchSortOrder}
                    onChange={(e) => setBatchSortOrder(e.target.value)}
                    placeholder="输入序号"
                    className="w-24 px-3 py-1.5 border border-blue-300 dark:border-blue-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                    min="0"
                  />
                  <button
                    onClick={handleBatchUpdateSort}
                    disabled={saving || !batchSortOrder}
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    确定
                  </button>
                  <button
                    onClick={() => { setBatchOperation(null); setBatchSortOrder(''); }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* 分类列表 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config?.color}`} />
              <span className="font-medium text-slate-900 dark:text-white">{config?.label}</span>
              <span className="text-sm text-slate-500">({categories.length} 个分类)</span>
            </div>
            {batchMode && categories.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400"
              >
                {selectedIds.size === categories.length ? '取消全选' : '全选'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin" />
              <p className="mt-2 text-slate-500">加载中...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              暂无分类，点击上方按钮添加
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {/* 非行业：平铺列表 */}
              {activeCategory !== 'project_industry' ? (
                categories.map((cat) => (
                  <CategoryRow 
                    key={cat.id} 
                    cat={cat}
                    editingId={editingId}
                    setEditingId={setEditingId}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    batchMode={batchMode}
                    selectedIds={selectedIds}
                    startEdit={startEdit}
                    handleDelete={handleDelete}
                    toggleSelect={toggleSelect}
                    saving={saving}
                    handleUpdate={handleUpdate}
                  />
                ))
              ) : (
                /* 行业：二级结构 */
                <IndustryCategoryView 
                  categories={categories} 
                  editingId={editingId}
                  setEditingId={setEditingId}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  batchMode={batchMode}
                  selectedIds={selectedIds}
                  expandedParents={expandedParents}
                  toggleExpand={toggleExpand}
                  startEdit={startEdit}
                  handleDelete={handleDelete}
                  toggleSelect={toggleSelect}
                  saving={saving}
                  handleUpdate={handleUpdate}
                  onAddChild={handleAddChild}
                />
              )}
            </div>
          )}
        </div>

        {/* 添加分类弹窗 */}
        {showAddForm && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[200]"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">批量添加分类</h3>
                <button onClick={() => setShowAddForm(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">排序序号</div>
                  <div className="col-span-7">分类名称</div>
                  <div className="col-span-1"></div>
                </div>
                
                {batchAddItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-1 text-slate-500">{index + 1}</div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={item.sortOrder}
                        onChange={(e) => {
                          const newItems = [...batchAddItems];
                          newItems[index].sortOrder = e.target.value;
                          setBatchAddItems(newItems);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                        placeholder="序号"
                        min="0"
                      />
                    </div>
                    <div className="col-span-7">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...batchAddItems];
                          newItems[index].name = e.target.value;
                          setBatchAddItems(newItems);
                        }}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                        placeholder="请输入分类名称"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {batchAddItems.length > 1 && (
                        <button
                          onClick={() => setBatchAddItems(items => items.filter((_, i) => i !== index))}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setBatchAddItems(items => [...items, { name: '', sortOrder: '' }])}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  添加一行
                </button>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchAdd}
                  disabled={saving || !batchAddItems.some(item => item.name.trim())}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '添加中...' : `添加 ${batchAddItems.filter(i => i.name.trim()).length} 个`}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 批量导入弹窗（行业专用） */}
        {showBulkImport && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[200]"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBulkImport(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">批量导入行业</h3>
                <button onClick={() => setShowBulkImport(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  输入行业名称（支持一级和二级分类）
                </label>
                <textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  className="w-full h-64 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none"
                  placeholder={"格式1 - 只导入一级分类：\n互联网\n金融科技\n医疗健康\n\n格式2 - 导入一级和二级分类：\n互联网:电商,金融,教育\n制造业:汽车,电子,机械\n服务业:餐饮,酒店,零售\n\n说明：冒号前是一级分类，冒号后是二级分类（用逗号分隔）"}
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowBulkImport(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={saving || !bulkImportText.trim()}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '导入中...' : `导入`}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 新增一级分类弹窗（行业专用） */}
        {showNewParentForm && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-[200]"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewParentForm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">新增一级分类</h3>
                <button onClick={() => setShowNewParentForm(false)}>
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    排序序号
                  </label>
                  <input
                    type="number"
                    value={newCategorySortOrder}
                    onChange={(e) => setNewCategorySortOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="数字越小越靠前"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    分类名称
                  </label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="请输入分类名称"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewParentForm(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (!newCategoryName.trim()) return;
                    setSaving(true);
                    try {
                      const response = await fetch('/api/admin/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          type: 'project_industry',
                          name: newCategoryName.trim(),
                          sortOrder: parseInt(newCategorySortOrder) || 0,
                          isParent: true
                        }),
                      });
                      const data = await response.json();
                      if (data.success) {
                        setShowNewParentForm(false);
                        setNewCategoryName('');
                        setNewCategorySortOrder('');
                        fetchCategories();
                        notifyOtherTabs();
                      }
                    } catch (error) {
                      console.error('添加分类失败:', error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving || !newCategoryName.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {saving ? '添加中...' : '添加'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// 一级分类行组件
function CategoryRow({ 
  cat, 
  editingId, 
  setEditingId,
  editForm, 
  setEditForm, 
  batchMode, 
  selectedIds, 
  startEdit, 
  handleDelete, 
  toggleSelect, 
  saving,
  handleUpdate 
}: { 
  cat: Category; 
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editForm: Partial<Category>;
  setEditForm: (f: Partial<Category>) => void;
  batchMode: boolean;
  selectedIds: Set<string>;
  startEdit: (cat: Category) => void;
  handleDelete: (id: string) => void;
  toggleSelect: (id: string) => void;
  saving: boolean;
  handleUpdate: () => void;
}) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
      {editingId === cat.id ? (
        <div className="flex-1 flex items-center gap-3">
          <input
            type="number"
            value={editForm.sort_order ?? ''}
            onChange={(e) => { const val = e.target.value ? parseInt(e.target.value) : 0; setEditForm({ ...editForm, sort_order: val }); }}
            className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            placeholder="序号"
          />
          <input
            type="text"
            value={editForm.name || ''}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
            autoFocus
          />
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          <button
            onClick={() => { setEditingId(null); setEditForm({}); }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
          >
            取消
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {batchMode && (
              <button
                onClick={() => toggleSelect(cat.id)}
                className="text-slate-400 hover:text-blue-500"
              >
                {selectedIds.has(cat.id) ? (
                  <Check className="w-5 h-5 text-blue-500" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded shrink-0">
              {cat.sort_order ?? 0}
            </span>
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-white">{cat.name}</div>
              {cat.description && (
                <div className="text-sm text-slate-500">{cat.description}</div>
              )}
            </div>
          </div>
          {!batchMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => startEdit(cat)}
                className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

