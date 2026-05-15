"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, FileText, Scale, Activity, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import AdminLayout from '../AdminLayout';

export default function StatsPage() {
  const monthlyStats = [
    { month: '1月', users: 120, relationships: 340, mediations: 15 },
    { month: '2月', users: 145, relationships: 420, mediations: 18 },
    { month: '3月', users: 180, relationships: 520, mediations: 22 },
    { month: '4月', users: 210, relationships: 610, mediations: 25 },
    { month: '5月', users: 250, relationships: 720, mediations: 28 },
    { month: '6月', users: 280, relationships: 850, mediations: 32 },
  ];

  const userTypeStats = [
    { type: '个人用户', count: 892, percentage: 71 },
    { type: '企业用户', count: 366, percentage: 29 },
  ];

  const relationshipTypeStats = [
    { type: '商业交易', count: 1520, percentage: 44 },
    { type: '投资', count: 820, percentage: 24 },
    { type: '合伙', count: 680, percentage: 20 },
    { type: '雇佣', count: 436, percentage: 12 },
  ];

  const topUsers = [
    { name: '张明', relationships: 28 },
    { name: '刘强', relationships: 25 },
    { name: '李华', relationships: 22 },
    { name: '王芳', relationships: 20 },
    { name: '陈思', relationships: 18 },
  ];

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
            数据统计
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            平台运营数据概览
          </p>
        </motion.div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: '总用户数', value: '1,258', change: '+18%', icon: Users, color: 'bg-blue-500' },
            { label: '合作关系', value: '3,456', change: '+12%', icon: FileText, color: 'bg-green-500' },
            { label: '协调申请', value: '89', change: '-5%', icon: Scale, color: 'bg-amber-500' },
            { label: '本月增长', value: '+156', change: '+22%', icon: TrendingUp, color: 'bg-purple-500' },
          ].map((stat, idx) => (
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
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                  stat.change.startsWith('+') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {stat.change.startsWith('+') ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Growth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-400" />
              月度增长趋势
            </h2>
            <div className="space-y-3">
              {monthlyStats.map((stat, idx) => (
                <div key={stat.month} className="flex items-center gap-4">
                  <span className="w-10 text-sm text-slate-500 dark:text-slate-400">{stat.month}</span>
                  <div className="flex-1 flex gap-2">
                    <div className="flex-1 h-8 bg-blue-100 dark:bg-blue-900/30 rounded relative overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded"
                        style={{ width: `${(stat.users / 280) * 100}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-300">
                        {stat.users}
                      </span>
                    </div>
                    <div className="flex-1 h-8 bg-green-100 dark:bg-green-900/30 rounded relative overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded"
                        style={{ width: `${(stat.relationships / 850) * 100}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-green-700 dark:text-green-300">
                        {stat.relationships}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-slate-500">新增用户</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-xs text-slate-500">新关系</span>
              </div>
            </div>
          </motion.div>

          {/* User Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              用户类型分布
            </h2>
            <div className="space-y-4">
              {userTypeStats.map((stat, idx) => (
                <div key={stat.type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{stat.type}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{stat.count} ({stat.percentage}%)</span>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-gradient-to-r from-purple-500 to-purple-400'}`}
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Relationship Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
          >
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              关系类型分布
            </h2>
            <div className="space-y-4">
              {relationshipTypeStats.map((stat, idx) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500'];
                return (
                  <div key={stat.type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{stat.type}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{stat.count} ({stat.percentage}%)</span>
                    </div>
                    <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${colors[idx]}`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>

        {/* Activity Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 text-white"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            实时数据
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <p className="text-3xl font-bold">156</p>
              <p className="text-sm text-blue-200">今日活跃用户</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <p className="text-3xl font-bold">42</p>
              <p className="text-sm text-blue-200">今日新增关系</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <p className="text-3xl font-bold">8</p>
              <p className="text-sm text-blue-200">进行中协调</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-lg">
              <p className="text-3xl font-bold">98.5%</p>
              <p className="text-sm text-blue-200">系统可用性</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
