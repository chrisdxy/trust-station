"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, Check } from 'lucide-react';

export interface IndustryOption {
  id: string;
  name: string;
  parent_id?: string | null;
  sort_order?: number;
  children?: IndustryOption[];
}

interface IndustrySelectProps {
  value: string; // 选中的行业ID
  onChange: (industryId: string, industryName: string) => void;
  placeholder?: string;
  required?: boolean;
  inline?: boolean; // 是否内联显示（始终展开）
}

// 构建分类树
function buildTree(all: IndustryOption[]): IndustryOption[] {
  const parents = all.filter(c => !c.parent_id);
  const children = all.filter(c => c.parent_id);
  return parents.map(p => ({
    ...p,
    children: children
      .filter(c => String(c.parent_id) === String(p.id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }));
}

// 获取选中项的显示名称
function getSelectedLabel(all: IndustryOption[], value: string): string {
  if (!value) return '';
  for (const parent of all) {
    if (String(parent.id) === String(value)) return parent.name;
    if (parent.children) {
      const child = parent.children.find(c => String(c.id) === String(value));
      if (child) return `${parent.name} / ${child.name}`;
    }
  }
  return value;
}

export function IndustrySelect({
  value,
  onChange,
  placeholder = '请选择行业',
  required = false,
  inline = false
}: IndustrySelectProps) {
  const [allOptions, setAllOptions] = useState<IndustryOption[]>([]);
  const [tree, setTree] = useState<IndustryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // 获取行业分类数据
  const fetchIndustries = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?type=project_industry');
      const data = await response.json();
      if (data.success && Array.isArray(data.categories)) {
        const items = data.categories as IndustryOption[];
        setAllOptions(items);
        setTree(buildTree(items));
      }
    } catch (error) {
      console.error('Failed to fetch industries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  // 切换父级展开/折叠
  const toggleExpand = (id: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 处理选择
  const handleSelect = (industry: IndustryOption) => {
    onChange(industry.id, industry.name);
    if (!inline) {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // 过滤行业（搜索功能）
  const filteredTree = searchTerm
    ? tree
        .map(p => ({
          ...p,
          children: p.children?.filter(c =>
            c.name.includes(searchTerm) || p.name.includes(searchTerm)
          )
        }))
        .filter(p =>
          p.name.includes(searchTerm) || (p.children && p.children.length > 0)
        )
    : tree;

  // 渲染树形列表（下拉和内联共用）
  const renderTree = (items: IndustryOption[]) => {
    if (loading) return <div className="text-center py-4 text-sm text-slate-500">加载中...</div>;
    if (items.length === 0) return <div className="text-center py-4 text-sm text-slate-500">暂无数据</div>;

    return items.map(parent => (
      <div key={parent.id}>
        {/* 一级分类 */}
        <div className="flex items-center">
          {parent.children && parent.children.length > 0 && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                toggleExpand(parent.id);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
            >
              {expandedParents.has(parent.id) ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (parent.children && parent.children.length > 0) {
                toggleExpand(parent.id);
              } else {
                handleSelect(parent);
              }
            }}
            className={`flex-1 text-left px-2 py-1.5 text-sm rounded-md flex items-center justify-between ${
              String(value) === String(parent.id)
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="font-medium">{parent.name}</span>
            {String(value) === String(parent.id) && <Check className="w-4 h-4" />}
          </button>
        </div>

        {/* 二级分类 */}
        {parent.children && expandedParents.has(parent.id) && (
          <div className="ml-6 border-l-2 border-slate-200 dark:border-slate-700">
            {parent.children.map(child => (
              <button
                key={child.id}
                type="button"
                onClick={() => handleSelect(child)}
                className={`w-full text-left px-3 py-1.5 text-sm rounded-md flex items-center justify-between ${
                  String(value) === String(child.id)
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>{child.name}</span>
                {String(value) === String(child.id) && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        )}
      </div>
    ));
  };

  // 获取选中行业的显示名称
  const selectedLabel = getSelectedLabel(allOptions, value);

  if (inline) {
    // 内联模式：始终显示树形选择器
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          行业
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索行业..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          {/* 树形列表 */}
          <div className="overflow-y-auto max-h-52 p-1">
            {renderTree(filteredTree)}
          </div>
        </div>
        {/* 已选显示 */}
        {value && (
          <p className="mt-1 text-xs text-slate-500">
            已选：{selectedLabel}
          </p>
        )}
      </div>
    );
  }

  // 下拉模式（原有逻辑，默认行为）
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        行业
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-left flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
      >
        <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="搜索行业..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-48 p-1">
              {renderTree(filteredTree)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
