"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';

export interface UserSearchResult {
  id: string;
  phone: string;
  display_name: string | null;
  real_name: string | null;
  avatar_url: string | null;
  identity_verified?: boolean;
}

interface UserSelectProps {
  onSelect: (user: UserSearchResult) => void;
  selectedUsers: UserSearchResult[];
  placeholder?: string;
  onRemove?: (userId: string) => void;  // 独立的移除回调（不使用 onSelect toggle）
}

export function UserSelect({ onSelect, selectedUsers, placeholder = '搜索用户...', onRemove }: UserSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
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
      setSearchResults([]);
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
            setSearchResults(availableUsers);
            setStatus('success');
          } else {
            setSearchResults([]);
            setStatus('not_found');
          }
        } else {
          setSearchResults([]);
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
  const handleSelect = (user: UserSearchResult) => {
    onSelect(user);
    setSearchQuery('');
    setSearchResults([]);
    setStatus('idle');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // 移除已选用户
  const handleRemove = (userId: string) => {
    if (onRemove) {
      onRemove(userId);
    } else {
      // 向后兼容：没有 onRemove 时通过 onSelect toggle 移除
      const user = selectedUsers.find(u => u.id === userId);
      if (user) {
        onSelect(user);
      }
    }
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length === 1) {
      e.preventDefault();
      handleSelect(searchResults[0]);
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
          {selectedUsers.map(user => (
            <span
              key={user.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm"
            >
              <User className="w-3 h-3" />
              <span>{user.real_name || user.display_name || '用户'}{user.phone ? '(尾号' + user.phone.slice(-4) + ')' : ''}</span>
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
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-20 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {loading && (
              <span className="text-xs text-slate-400 animate-pulse">搜索中...</span>
            )}
          </div>
        </div>

        {/* 搜索结果下拉 */}
        {showDropdown && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
            {/* 加载中 */}
            {loading && (
              <div className="px-4 py-3 text-sm text-slate-500">搜索中...</div>
            )}

            {/* 匹配结果列表 */}
            {status === 'success' && searchResults.length > 0 && !loading && (
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className="w-full px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 transition-colors last:border-b-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {user.real_name || user.display_name || '未命名用户'}
                        <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400 inline-flex items-center gap-0.5">
                          <CheckCircle className="w-3 h-3" />
                          匹配成功
                        </span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${
                          user.identity_verified
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}>
                          {user.identity_verified ? '身份已认证' : '身份未认证'}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {user.phone}
                        {user.real_name && user.real_name !== (user.display_name || user.real_name) && (
                          <span className="text-slate-400">· {user.display_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="px-2.5 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium whitespace-nowrap">
                        点击添加
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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

            {/* 结果数量提示 */}
            {status === 'success' && searchResults.length > 0 && !loading && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500">
                找到 {searchResults.length} 个匹配结果，点击右侧"点击添加"选择
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
