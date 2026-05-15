"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, Check, CheckCircle, AlertCircle } from 'lucide-react';

export interface UserSearchResult {
  id: string;
  phone: string;
  display_name: string | null;
  real_name: string | null;
  avatar_url: string | null;
}

interface UserSelectProps {
  onSelect: (user: UserSearchResult) => void;
  selectedUsers: UserSearchResult[];
  placeholder?: string;
}

export function UserSelect({ onSelect, selectedUsers, placeholder = '搜索用户...' }: UserSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'not_found' | 'error'>('idle');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 搜索用户（实时搜索，带防抖）
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = searchQuery.trim();
    
    // 清空时重置状态
    if (!query) {
      setSearchResult(null);
      setStatus('idle');
      setShowDropdown(false);
      return;
    }

    // 显示下拉框
    setShowDropdown(true);

    // 防抖搜索
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        // 支持多种搜索方式：手机号、姓名、昵称
        params.append('q', query);

        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.users && data.users.length > 0) {
          // 过滤掉已选中的用户
          const selectedIds = selectedUsers.map(u => u.id);
          const availableUsers = data.users.filter((u: UserSearchResult) => !selectedIds.includes(u.id));
          
          if (availableUsers.length > 0) {
            setSearchResult(availableUsers[0]); // 只显示第一个匹配结果
            setStatus('success');
          } else if (data.users.length > 0) {
            // 所有匹配结果都已被选中
            setSearchResult(null);
            setStatus('not_found');
          } else {
            setSearchResult(null);
            setStatus('not_found');
          }
        } else {
          setSearchResult(null);
          setStatus('not_found');
        }
      } catch (error) {
        console.error('搜索用户失败:', error);
        setStatus('error');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, selectedUsers]);

  // 选择用户
  const handleSelect = () => {
    if (searchResult) {
      onSelect(searchResult);
      setSearchQuery('');
      setSearchResult(null);
      setStatus('idle');
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  };

  // 移除已选用户
  const handleRemove = (userId: string) => {
    const user = selectedUsers.find(u => u.id === userId);
    if (user) {
      onSelect(user);
    }
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResult) {
      e.preventDefault();
      handleSelect();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="space-y-3">
      {/* 已选用户显示 */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm"
            >
              <User className="w-3 h-3" />
              <span>{user.real_name || user.display_name || '用户'}</span>
              <span className="text-xs text-slate-500 ml-1">{user.phone}</span>
              <button
                type="button"
                onClick={() => handleRemove(user.id)}
                className="ml-1 hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 搜索输入框 */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-20 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <span className="text-xs text-slate-400 animate-pulse">搜索中...</span>
            )}
            {status === 'success' && !loading && searchResult && (
              <button
                type="button"
                onClick={handleSelect}
                className="flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Check className="w-3 h-3" />
                选择
              </button>
            )}
          </div>
        </div>

        {/* 搜索结果下拉 */}
        {showDropdown && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
            {/* 匹配成功状态 */}
            {status === 'success' && searchResult && (
              <button
                type="button"
                onClick={handleSelect}
                className="w-full px-4 py-4 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-4 border-b border-slate-100 dark:border-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  {searchResult.avatar_url ? (
                    <img src={searchResult.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {searchResult.real_name || searchResult.display_name || '未命名用户'}
                    <span className="ml-2 text-sm font-normal text-green-600 dark:text-green-400 flex items-center gap-1 inline-flex">
                      <CheckCircle className="w-3 h-3" />
                      匹配成功
                    </span>
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {searchResult.phone}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm font-medium">
                    点击添加
                  </div>
                </div>
              </button>
            )}

            {/* 未找到状态 */}
            {status === 'not_found' && !loading && (
              <div className="px-4 py-3 text-sm text-slate-500">
                未找到匹配的用户 "{searchQuery}"
              </div>
            )}

            {/* 错误状态 */}
            {status === 'error' && !loading && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium">搜索失败</p>
                <p className="text-sm text-slate-400 mt-1">请稍后重试</p>
              </div>
            )}

            {/* 提示信息 */}
            {status === 'success' && searchResult && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500">
                按 Enter 直接添加，或点击上方卡片确认
              </div>
            )}
          </div>
        )}
      </div>

      {/* 搜索提示 */}
      {selectedUsers.length === 0 && (
        <p className="text-xs text-slate-400">
          输入手机号、姓名或昵称自动搜索，匹配成功后点击"选择"按钮添加
        </p>
      )}
    </div>
  );
}
