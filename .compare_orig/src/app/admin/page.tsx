"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, Scale, TrendingUp, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';

export default function AdminDashboard() {
  const stats = [
    { label: '注册用户', value: '1,258', change: '+12%', icon: Users, color: 'bg-blue-500' },
    { label: '合作关系', value: '3,456', change: '+8%', icon: FileText, color: 'bg-green-500' },
    { label: '进行中协调', value: '23', change: '-5%', icon: Scale, color: 'bg-amber-500' },
    { label: '本月增长', value: '+156', change: '+18%', icon: TrendingUp, color: 'bg-purple-500' },
  ];

  const recentActivities = [
    { type: 'user', text: '新用户注册：张明', time: '5分钟前', icon: Users, color: 'text-blue-500' },
    { type: 'relationship', text: '新关系创建：项目合作协议', time: '15分钟前', icon: FileText, color: 'text-green-500' },
    { type: 'mediation', text: '协调申请：王五 vs 李四', time: '30分钟前', icon: Scale, color: 'text-amber-500' },
    { type: 'user', text: '用户升级：张三成为认证用户', time: '1小时前', icon: CheckCircle, color: 'text-green-500' },
  ];

  const pendingTasks = [
    { id: 1, title: '待审核协调申请', count: 5, priority: 'high', icon: Scale },
    { id: 2, title: '待处理用户申诉', count: 3, priority: 'medium', icon: AlertCircle },
    { id: 3, title: '待验证新用户', count: 12, priority: 'low', icon: Clock },
  ];

  const priorityColors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            管理控制台
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            欢迎回来，系统运行一切正常
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.change.startsWith('+') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              待办事项
            </h2>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <task.icon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                      {task.count}
                    </span>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      处理
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              最近动态
            </h2>
            <div className="space-y-4">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0`}>
                    <activity.icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{activity.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 text-white"
        >
          <h2 className="text-lg font-semibold mb-4">快速操作</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-center transition-colors">
              <Users className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm">用户审核</span>
            </button>
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-center transition-colors">
              <FileText className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm">关系审批</span>
            </button>
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-center transition-colors">
              <Scale className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm">协调处理</span>
            </button>
            <button className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-center transition-colors">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm">系统公告</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
