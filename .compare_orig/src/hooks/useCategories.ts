"use client";
import { useState, useEffect, useCallback } from 'react';

// 分类类型
export type CategoryType =
  | 'community'
  | 'project_industry'
  | 'project_type'
  | 'activity'
  | 'cooperation'
  | 'record'
  | 'mediator_type'
  | 'expertise_area'
  | 'partner_level';

// 分类项
export interface Category {
  id: string;
  name: string;
  description?: string;
  count?: number;
}

const CACHE_KEY = 'admin_categories';

const ALL_TYPES: CategoryType[] = [
  'community',
  'project_industry',
  'project_type',
  'activity',
  'cooperation',
  'record',
  'mediator_type',
  'expertise_area',
  'partner_level',
];

// 从 API 获取单个类型的分类
async function fetchCategoryFromAPI(
  type: CategoryType
): Promise<Category[]> {
  try {
    const response = await fetch(`/api/admin/categories?type=${type}`);
    const data = await response.json();
    if (data.success && Array.isArray(data.categories)) {
      return data.categories.map((c: any) => ({
        id: String(c.id),
        name: c.name,
        description: c.description,
      }));
    }
  } catch (e) {
    console.error(`Failed to fetch categories for ${type}:`, e);
  }
  return [];
}

// 写入缓存
function saveCache(data: Record<string, Category[]>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (_) { /* ignore */ }
}

// 读取缓存
function loadCache(): Record<string, Category[]> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return {};
}

// 全局刷新 key（同标签页通知）
let globalRefreshKey = 0;
const refreshListeners = new Set<() => void>();

/**
 * 获取所有分类（主要 hook）
 * - 首次加载从 API 获取
 * - 监听跨标签页 localStorage 变化
 * - 可通过 refreshAllCategories() 强制刷新
 */
export function useCategories() {
  const [categories, setCategories] = useState<Record<CategoryType, Category[]>>(
    () => {
      const cached = loadCache();
      const init = {} as Record<CategoryType, Category[]>;
      ALL_TYPES.forEach((t) => {
        init[t] = cached[t] || [];
      });
      return init;
    }
  );

  // 从 API 刷新所有分类
  const refresh = useCallback(async () => {
    const results = await Promise.all(
      ALL_TYPES.map((t) => fetchCategoryFromAPI(t))
    );

    const next = {} as Record<CategoryType, Category[]>;
    ALL_TYPES.forEach((t, i) => {
      // API 成功则用 API 数据，否则保留缓存
      next[t] =
        results[i].length > 0
          ? results[i]
          : loadCache()[t] || [];
    });

    setCategories(next);
    saveCache(next as any);
  }, []);

  // 同标签页通知：refreshAllCategories() 会触发这里
  useEffect(() => {
    refreshListeners.add(refresh);
    return () => {
      refreshListeners.delete(refresh);
    };
  }, [refresh]);

  // 跨标签页通知：localStorage 变化时 refreshKey 会变更
  const refreshKey = useCategoriesRefresh();

  useEffect(() => {
    // refreshKey 初始值为 0，跳过首次（由下面的 mount effect 处理）
    if (refreshKey > 0) {
      refresh();
    }
  }, [refreshKey, refresh]);

  // 首次加载
  useEffect(() => {
    refresh();
  }, [refresh]);

  return categories;
}

/** 供外部调用：强制所有 useCategories 消费者重新从 API 获取 */
export function refreshAllCategories() {
  globalRefreshKey++;
  refreshListeners.forEach((fn) => {
    try { fn(); } catch (_) {}
  });
}

/** 获取特定类型的分类 */
export function useCategoryByType(type: CategoryType) {
  const categories = useCategories();
  return categories[type] || [];
}

/** 获取分类选项（用于下拉框） */
export function useCategoryOptions(type: CategoryType) {
  const list = useCategoryByType(type);
  return list.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));
}

/** 工具函数：根据 type 和 categoryId 获取分类名称 */
export function getCategoryLabel(
  type: CategoryType,
  categories: Record<CategoryType, Category[]>,
  categoryId: string
): string {
  const list = categories[type] || [];
  const found = list.find((c) => c.id === categoryId);
  return found?.name || categoryId;
}

/**
 * 监听 localStorage 变化（跨标签页同步）
 * 当其他标签页写入 CACHE_KEY 时，返回一个新的 refreshKey
 * useCategories() 内部会用这个 key 触发刷新
 */
export function useCategoriesRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CACHE_KEY) {
        setRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return refreshKey;
}
