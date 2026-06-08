"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Shield, CheckCircle, XCircle, Loader2, Edit, Trash2, UserCheck, Settings, X, ChevronLeft, ChevronRight, Clock, BadgeCheck } from 'lucide-react';
import AdminLayout from '../AdminLayout';

interface User {
  id: string;
  phone: string;
  display_name: string;
  real_name: string;
  user_type: string;
  company_name?: string;
  identity_verified: boolean;
  avatar_url?: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<string>('admin');
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({
    admin: '',
    user: '',
    coordinator: '',
    partner: '',
  });
  const [statusFilters, setStatusFilters] = useState<Record<string, string>>({
    coordinator: 'pending',
    partner: 'pending',
  });
  const [usersData, setUsersData] = useState<Record<string, User[]>>({
    admin: [],
    user: [],
    coordinator: [],
    partner: [],
  });
  const [paginationData, setPaginationData] = useState<Record<string, Pagination>>({
    admin: { page: 1, limit: 20, total: 0, totalPages: 0 },
    user: { page: 1, limit: 20, total: 0, totalPages: 0 },
    coordinator: { page: 1, limit: 20, total: 0, totalPages: 0 },
    partner: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [showPermissionsPanel, setShowPermissionsPanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 加载用户数据
  const fetchUsersByType = async (type: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: paginationData[type].page.toString(),
        limit: '20',
        search: searchTerms[type] || '',
        userType: type,
      });
      
      // 对于协调专家和合伙人，添加状态筛选
      if ((type === 'coordinator' || type === 'partner') && statusFilters[type]) {
        params.append('status', statusFilters[type]);
      }
      
      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setUsersData(prev => ({ ...prev, [type]: data.users || [] }));
        setPaginationData(prev => ({ ...prev, [type]: data.pagination }));
      }
    } catch (error) {
      console.error('获取用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersByType(activeTab);
  }, [activeTab, statusFilters.coordinator, statusFilters.partner]);

  // 搜索处理
  const handleSearch = (type: string, value: string) => {
    setSearchTerms(prev => ({ ...prev, [type]: value }));
    setPaginationData(prev => ({ ...prev, [type]: { ...prev[type], page: 1 } }));
  };

  // 切换标签时重置搜索
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchTerms(prev => ({ ...prev, [tab]: '' }));
    if (tab !== 'coordinator' && tab !== 'partner') {
      setPaginationData(prev => ({ ...prev, [tab]: { ...prev[tab], page: 1 } }));
    }
  };

  // 状态筛选切换
  const handleStatusChange = (type: string, status: string) => {
    setStatusFilters(prev => ({ ...prev, [type]: status }));
    setPaginationData(prev => ({ ...prev, [type]: { ...prev[type], page: 1 } }));
    fetchUsersByType(type);
  };

  // 搜索并刷新
  const handleSearchSubmit = (type: string) => {
    setPaginationData(prev => ({ ...prev, [type]: { ...prev[type], page: 1 } }));
    fetchUsersByType(type);
  };

  // 分页
  const handlePageChange = (type: string, newPage: number) => {
    setPaginationData(prev => ({ ...prev, [type]: { ...prev[type], page: newPage } }));
  };

  useEffect(() => {
    if (activeTab !== 'coordinator' && activeTab !== 'partner') {
      fetchUsersByType(activeTab);
    }
  }, [paginationData[activeTab].page]);

  // 获取用户类型标签
  const getUserTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      admin: '管理员',
      user: '普通用户',
      coordinator: '协调专家',
      partner: '合伙人',
    };
    return labels[type] || type;
  };

  // 获取标签颜色
  const getTabColor = (type: string) => {
    const colors: Record<string, { active: string; inactive: string }> = {
      admin: { active: 'bg-green-500 text-white', inactive: 'bg-green-100 text-green-700 hover:bg-green-200' },
      user: { active: 'bg-gray-500 text-white', inactive: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
      coordinator: { active: 'bg-green-500 text-white', inactive: 'bg-green-100 text-green-700 hover:bg-green-200' },
      partner: { active: 'bg-cyan-500 text-white', inactive: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
    };
    return colors[type] || { active: 'bg-blue-500 text-white', inactive: 'bg-slate-100 text-slate-700 hover:bg-slate-200' };
  };

  // 处理用户操作
  const handleUserAction = async (action: string, user: User) => {
    switch (action) {
      case 'setAdmin':
        if (confirm(`确定将 ${user.real_name || user.display_name || '该用户'} 设为管理员？`)) {
          const res = await fetch(`/api/admin/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, updates: { user_type: 'admin' } }),
          });
          const data = await res.json();
          if (data.success) {
            alert('已设为管理员');
            fetchUsersByType(activeTab);
          } else {
            alert(data.error || '操作失败');
          }
        }
        break;
      case 'setPermissions':
        setSelectedUser(user);
        setShowPermissionsPanel(true);
        break;
      case 'edit':
        alert('编辑功能开发中');
        break;
      case 'delete':
        if (confirm(`确定删除用户 ${user.real_name || user.display_name || '该用户'}？此操作不可恢复！`)) {
          const res = await fetch(`/api/admin/users?userId=${user.id}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.success) {
            alert('用户已删除');
            fetchUsersByType(activeTab);
          } else {
            alert(data.error || '操作失败');
          }
        }
        break;
      case 'approve':
        const resApprove = await fetch(`/api/admin/users`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, appType: activeTab, updates: { user_type: activeTab === 'coordinator' ? 'coordinator' : 'partner' } }),
        });
        const dataApprove = await resApprove.json();
        if (dataApprove.success) {
          alert('已审批通过');
          fetchUsersByType(activeTab);
        } else {
          alert(dataApprove.error || '操作失败');
        }
        break;
      case 'reject':
        if (confirm(`确定拒绝 ${user.real_name || user.display_name || '该用户'} 的申请？`)) {
          const resReject = await fetch(`/api/admin/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, updates: { user_type: 'rejected' } }),
          });
          const dataReject = await resReject.json();
          if (dataReject.success) {
            alert('已拒绝');
            fetchUsersByType(activeTab);
          } else {
            alert(dataReject.error || '操作失败');
          }
        }
        break;
    }
  };

  // 渲染操作按钮
  const renderUserActions = (user: User) => {
    switch (activeTab) {
      case 'admin':
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => handleUserAction('setPermissions', user)} className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors">设定权限</button>
            <button onClick={() => handleUserAction('delete', user)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors">删除</button>
          </div>
        );
      case 'user':
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => handleUserAction('setAdmin', user)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors">设为管理员</button>
            <button onClick={() => handleUserAction('delete', user)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors">删除</button>
          </div>
        );
      case 'coordinator':
      case 'partner':
        const approved = user.user_type === 'coordinator' || user.user_type === 'partner';
        return (
          <div className="flex items-center gap-2">
            {!approved && (
              <>
                <button onClick={() => handleUserAction('approve', user)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors">审批</button>
                <button onClick={() => handleUserAction('reject', user)} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors">拒绝</button>
              </>
            )}
            {approved && (
              <span className="px-2 py-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/20 rounded">已认证</span>
            )}
            <button onClick={() => handleUserAction('delete', user)} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors">删除</button>
          </div>
        );
      default:
        return null;
    }
  };

  const currentUsers = usersData[activeTab] || [];
  const currentPagination = paginationData[activeTab];
  const currentSearch = searchTerms[activeTab] || '';
  const currentStatus = statusFilters[activeTab] || 'all';
  const showStatusFilter = activeTab === 'coordinator' || activeTab === 'partner';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">用户管理</h1>
              <p className="text-sm text-slate-500">管理平台所有用户信息</p>
            </div>
          </div>
        </div>

        {/* 用户类型标签切换 */}
        <div className="flex flex-wrap gap-2">
          {['admin', 'user', 'partner'].map((type) => {
            const colors = getTabColor(type);
            const isActive = activeTab === type;
            const total = paginationData[type]?.total || 0;
            
            return (
              <button
                key={type}
                onClick={() => handleTabChange(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive ? colors.active : colors.inactive
                }`}
              >
                {getUserTypeLabel(type)}
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-current/10'}`}>
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        {/* 当前标签的搜索和用户列表 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* 搜索栏 */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            {/* 状态筛选（仅协调专家和合伙人） */}
            {showStatusFilter && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-600 dark:text-slate-300">状态筛选：</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(activeTab, 'pending')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      currentStatus === 'pending'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                    }`}
                  >
                    待审批
                  </button>
                  <button
                    onClick={() => handleStatusChange(activeTab, 'approved')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      currentStatus === 'approved'
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                    }`}
                  >
                    已审批
                  </button>
                  <button
                    onClick={() => handleStatusChange(activeTab, 'rejected')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center gap-1 ${
                      currentStatus === 'rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500'
                    }`}
                  >
                    已拒绝
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={`搜索${getUserTypeLabel(activeTab)}（手机号、姓名、公司）...`}
                  value={currentSearch}
                  onChange={(e) => handleSearch(activeTab, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(activeTab)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => handleSearchSubmit(activeTab)}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                搜索
              </button>
              {currentSearch && (
                <button
                  onClick={() => {
                    handleSearch(activeTab, '');
                    handleSearchSubmit(activeTab);
                  }}
                  className="px-3 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            {currentSearch && (
              <div className="mt-2 text-sm text-slate-500">
                当前搜索：<span className="font-medium text-blue-600">{currentSearch}</span>，共找到 {currentPagination.total} 条结果
              </div>
            )}
          </div>

          {/* 用户列表 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">用户信息</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">注册时间</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin" />
                      <p className="mt-2 text-slate-500">加载中...</p>
                    </td>
                  </tr>
                ) : currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                      <p>{currentSearch ? '未找到匹配的用户' : `暂无${getUserTypeLabel(activeTab)}`}</p>
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                            {(user.display_name || user.real_name || '用户').charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">
                              {user.real_name || user.display_name || '未设置昵称'}
                            </div>
                            <div className="text-sm text-slate-500">{user.phone}</div>
                            {user.company_name && (
                              <div className="text-sm text-slate-500">{user.company_name}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {renderUserActions(user)}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {currentPagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                第 {currentPagination.page} 页，共 {currentPagination.totalPages} 页，共 {currentPagination.total} 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(activeTab, currentPagination.page - 1)}
                  disabled={currentPagination.page <= 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm">
                  {currentPagination.page} / {currentPagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(activeTab, currentPagination.page + 1)}
                  disabled={currentPagination.page >= currentPagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                >
                  下一页
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    
      {/* 权限设定侧边栏 */}
      {showPermissionsPanel && selectedUser && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPermissionsPanel(false)} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-800 shadow-xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">设定权限</h2>
              <button onClick={() => setShowPermissionsPanel(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                  {(selectedUser.real_name || selectedUser.display_name || '用户').charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedUser.real_name || selectedUser.display_name || '未设置昵称'}</p>
                  <p className="text-sm text-slate-500">{selectedUser.phone}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900 dark:text-white">可选权限</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500" defaultChecked />
                    <span className="text-slate-700 dark:text-slate-300">用户管理</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500" defaultChecked />
                    <span className="text-slate-700 dark:text-slate-300">分类设置</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500" defaultChecked />
                    <span className="text-slate-700 dark:text-slate-300">协调管理</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-500 focus:ring-blue-500" defaultChecked />
                    <span className="text-slate-700 dark:text-slate-300">AI工具管理</span>
                  </label>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => { alert('权限已保存'); setShowPermissionsPanel(false); }}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                >
                  保存权限
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}
