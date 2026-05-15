"use client";
import React, { useState } from 'react';
import { Check, Square, Edit, Trash2, Plus } from 'lucide-react';

export interface IndustryCategory {
  id: string;
  type: string;
  name: string;
  description?: string;
  sort_order?: number;
  status?: string;
  parent_id?: string | null;
}

export interface IndustryCategoryViewProps {
  categories: IndustryCategory[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editForm: Partial<IndustryCategory>;
  setEditForm: (f: Partial<IndustryCategory>) => void;
  batchMode: boolean;
  selectedIds: Set<string>;
  expandedParents: Set<string>;
  toggleExpand: (id: string) => void;
  startEdit: (cat: IndustryCategory) => void;
  handleDelete: (id: string) => void;
  toggleSelect: (id: string) => void;
  saving: boolean;
  handleUpdate: () => void;
  onAddChild?: (parentId: string, name: string, sortOrder: number) => void;
}

export function IndustryCategoryView({
  categories,
  editingId,
  setEditingId,
  editForm,
  setEditForm,
  batchMode,
  selectedIds,
  expandedParents,
  toggleExpand,
  startEdit,
  handleDelete,
  toggleSelect,
  saving,
  handleUpdate,
  onAddChild,
}: IndustryCategoryViewProps) {
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [newChildSortOrder, setNewChildSortOrder] = useState('');

  const parents = categories.filter(c => !c.parent_id);
  const children = categories.filter(c => c.parent_id);

  const getChildren = (parentId: string) => {
    console.log('[getChildren] parentId:', parentId, 'children:', children);
    const result = children
      .filter(c => String(c.parent_id) === String(parentId))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    console.log('[getChildren] result:', result);
    return result;
  };

  const renderEditRow = (cat: IndustryCategory) => (
    <div key={cat.id} className="p-4 flex items-center gap-3">
      <input
        type="number"
        value={editForm.sort_order ?? ''}
        onChange={(e) => {
          const val = e.target.value ? parseInt(e.target.value) : 0;
          setEditForm({ ...editForm, sort_order: val });
        }}
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
  );

  const renderParentRow = (parent: IndustryCategory) => {
    const parentChildren = getChildren(parent.id);
    const isExpanded = expandedParents.has(parent.id);
    const parentSelected = selectedIds.has(parent.id);
    const allChildrenSelected =
      parentChildren.length > 0 &&
      parentChildren.every(c => selectedIds.has(c.id));

    return (
      <div key={parent.id}>
        <div className="p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-700/50">
          {editingId === parent.id ? (
            renderEditRow(parent)
          ) : (
            <>
              <div className="flex items-center gap-3">
                {batchMode && (
                  <button
                    onClick={() => {
                      // Toggle parent and all its children
                      const newSet = new Set(selectedIds);
                      const childrenIds = parentChildren.map(c => c.id);
                      const shouldSelect = !parentSelected && !allChildrenSelected;
                      if (shouldSelect) {
                        newSet.add(parent.id);
                        childrenIds.forEach(id => newSet.add(id));
                      } else {
                        newSet.delete(parent.id);
                        childrenIds.forEach(id => newSet.delete(id));
                      }
                      // toggleSelect for each, but we need a bulk setter; for simplicity call toggleSelect repeatedly
                      // Actually, we should use a bulk update. For now just toggle parent.
                      toggleSelect(parent.id);
                      parentChildren.forEach(c => toggleSelect(c.id));
                    }}
                    className="text-slate-400 hover:text-blue-500"
                  >
                    {parentSelected || allChildrenSelected ? (
                      <Check className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => toggleExpand(parent.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400 shrink-0">
                  {parent.sort_order ?? 0}.
                </span>
                <span className="text-lg font-semibold text-slate-900 dark:text-white">
                  {parent.name}
                </span>
                <span className="text-sm text-slate-500">({parentChildren.length}个子类)</span>
              </div>
              {!batchMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEdit(parent)}
                    className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(parent.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Children rows */}
        {isExpanded && (
          <div className="bg-white dark:bg-slate-800">
            {parentChildren.map((child) => (
              <div key={child.id} className="p-3 pl-12 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                {editingId === child.id ? (
                  renderEditRow(child)
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {batchMode && (
                        <button
                          onClick={() => toggleSelect(child.id)}
                          className="text-slate-400 hover:text-blue-500"
                        >
                          {selectedIds.has(child.id) ? (
                            <Check className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <span className="text-sm text-slate-400 dark:text-slate-500 shrink-0">
                        └ {child.sort_order ?? 0}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{child.name}</span>
                    </div>
                    {!batchMode && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(child)}
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(child.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Add subcategory section */}
            {!batchMode && (
              <div className="border-t border-slate-100 dark:border-slate-700">
                {addingChildFor === parent.id ? (
                  <div className="p-3 pl-12 flex items-center gap-3">
                    <input
                      type="number"
                      value={newChildSortOrder}
                      onChange={(e) => setNewChildSortOrder(e.target.value)}
                      className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                      placeholder="序号"
                    />
                    <input
                      type="text"
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                      placeholder="输入子类名称"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (onAddChild && newChildName.trim()) {
                          onAddChild(parent.id, newChildName.trim(), parseInt(newChildSortOrder) || parentChildren.length + 1);
                          setAddingChildFor(null);
                          setNewChildName('');
                          setNewChildSortOrder('');
                        }
                      }}
                      disabled={!newChildName.trim()}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => {
                        setAddingChildFor(null);
                        setNewChildName('');
                        setNewChildSortOrder('');
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAddingChildFor(parent.id);
                      setNewChildName('');
                      setNewChildSortOrder(String(parentChildren.length + 1));
                    }}
                    className="w-full p-3 pl-12 text-left text-sm text-blue-500 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    添加子类
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {parents.map(parent => renderParentRow(parent))}
    </div>
  );
}
