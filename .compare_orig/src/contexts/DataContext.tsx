"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// 项目数据类型
export interface Project {
  id: string;
  title: string;
  status: string;
  location: string;
  industry: string;
  type: string;
  description: string;
  images: string[];
  date: string;
  participants?: number;
}

// 活动数据类型
export interface Activity {
  id: string;
  title: string;
  type: 'online' | 'offline';
  status: string;
  participants: number;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  images: string[];
  hosts: Array<{ type: 'person' | 'community'; name: string; email?: string; communityId?: string }>;
}

// 共同体数据类型
export interface Community {
  id: string;
  name: string;
  members: number;
  category: string;
  description: string;
  images: string[];
  activities: Array<{ id: string; title: string; date: string; time: string; participants: number }>;
  createdAt: string;
  isPublic: boolean;
  memberList: Array<{ name: string; email: string; role: 'creator' | 'admin' | 'member'; joinedAt: string }>;
}

// 共同体成员类型
export interface NewMember {
  id: string;
  name: string;
  title: string;
  joinedAt: string;
}

// 公开名片类型
export interface PublicProfile {
  id: string;
  type: 'personal' | 'enterprise' | 'expert' | 'partner';
  fields: Array<{ key: string; label: string; value: string; type: 'text' | 'textarea' | 'link' | 'email' | 'phone' | 'phones' }>;
  phoneNumbers: string[];
  isDefault: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  shareCode: string;
}

// 数据上下文类型
interface DataContextType {
  // 项目
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'date'>) => void;
  updateProject: (id: string, project: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // 活动
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, activity: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  
  // 共同体
  communities: Community[];
  addCommunity: (community: Omit<Community, 'id' | 'createdAt'>) => void;
  updateCommunity: (id: string, community: Partial<Community>) => void;
  deleteCommunity: (id: string) => void;
  
  // 新成员（用于发现广场的"新伙伴"标签）
  newMembers: NewMember[];
  
  // 公开名片
  publicProfiles: PublicProfile[];
  setPublicProfiles: React.Dispatch<React.SetStateAction<PublicProfile[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// 初始数据
const initialProjects: Project[] = [
  { id: '1', title: '智慧城市建设', status: 'ongoing', location: '北京', industry: '科技', type: '合作', description: '智慧城市建设项目旨在利用信息技术提升城市管理效率，改善市民生活质量。', images: [], date: '2024-03-01', participants: 8 },
  { id: '2', title: '新能源项目合作', status: 'recruiting', location: '上海', industry: '能源', type: '投资', description: '寻找新能源领域投资合作伙伴，共同开发太阳能、风能等项目。', images: [], date: '2024-02-15', participants: 12 },
  { id: '3', title: '农业科技园', status: 'ongoing', location: '深圳', industry: '农业', type: '合伙', description: '打造现代化农业科技园区，集研发、种植、展示于一体。', images: [], date: '2024-01-20', participants: 6 },
];

const initialActivities: Activity[] = [
  { id: '1', title: '创业者沙龙', type: 'offline', status: 'upcoming', participants: 25, location: '北京朝阳', date: '2024-03-25', startTime: '14:00', endTime: '17:00', description: '创业者沙龙是一个汇聚创新者、投资人和企业家的平台。', images: [], hosts: [] },
  { id: '2', title: '信任建设工作坊', type: 'online', status: 'ongoing', participants: 150, location: '线上', date: '2024-03-20', startTime: '19:00', endTime: '21:00', description: '通过互动练习和案例分析，帮助参与者建立更深层次的信任关系。', images: [], hosts: [] },
  { id: '3', title: '商业合作交流会', type: 'offline', status: 'upcoming', participants: 40, location: '上海浦东', date: '2024-03-28', startTime: '10:00', endTime: '16:00', description: '为企业和个人提供面对面交流的机会，探索潜在的商业合作可能。', images: [], hosts: [] },
];

const initialCommunities: Community[] = [
  { id: '1', name: '创业者联盟', members: 256, category: 'entrepreneurship', description: '连接创业者，共享资源与经验。', images: [], activities: [{ id: 'a1', title: '创业者沙龙', date: '2024-03-25', time: '14:00', participants: 25 }], createdAt: '2024-01-15', isPublic: true, memberList: [] },
  { id: '2', name: '高效沟通圈', members: 128, category: 'communication', description: '学习沟通技巧，提升人际关系。', images: [], activities: [{ id: 'a2', title: '沟通技巧工作坊', date: '2024-03-22', time: '19:00', participants: 30 }], createdAt: '2024-02-01', isPublic: true, memberList: [] },
  { id: '3', name: '读书会', members: 89, category: 'reading', description: '每月一本书，共同成长进步。', images: [], activities: [{ id: 'a3', title: '《原则》读书分享', date: '2024-03-30', time: '15:00', participants: 15 }], createdAt: '2024-01-20', isPublic: true, memberList: [] },
  { id: '4', name: '正念修习社', members: 64, category: 'mindfulness', description: '培养正念习惯，提升内心平静。', images: [], activities: [], createdAt: '2024-02-10', isPublic: true, memberList: [] },
];

const initialNewMembers: NewMember[] = [
  { id: '1', name: '张明', title: '创业者', joinedAt: '2024-03-18' },
  { id: '2', name: '李华', title: '项目经理', joinedAt: '2024-03-17' },
  { id: '3', name: '王芳', title: '设计师', joinedAt: '2024-03-16' },
  { id: '4', name: '刘强', title: '技术总监', joinedAt: '2024-03-15' },
  { id: '5', name: '陈静', title: '投资人', joinedAt: '2024-03-14' },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [newMembers, setNewMembers] = useState<NewMember[]>(initialNewMembers);
  const [publicProfiles, setPublicProfiles] = useState<PublicProfile[]>([]);

  // 项目操作
  const addProject = useCallback((project: Omit<Project, 'id' | 'date'>) => {
    const newProject: Project = {
      ...project,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    };
    setProjects(prev => [newProject, ...prev]);
  }, []);

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  // 活动操作
  const addActivity = useCallback((activity: Omit<Activity, 'id'>) => {
    const newActivity: Activity = {
      ...activity,
      id: Date.now().toString(),
    };
    setActivities(prev => [newActivity, ...prev]);
  }, []);

  const updateActivity = useCallback((id: string, updates: Partial<Activity>) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const deleteActivity = useCallback((id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  // 共同体操作
  const addCommunity = useCallback((community: Omit<Community, 'id' | 'createdAt'>) => {
    const newCommunity: Community = {
      ...community,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCommunities(prev => [newCommunity, ...prev]);
  }, []);

  const updateCommunity = useCallback((id: string, updates: Partial<Community>) => {
    setCommunities(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCommunity = useCallback((id: string) => {
    setCommunities(prev => prev.filter(c => c.id !== id));
  }, []);

  return (
    <DataContext.Provider value={{
      projects,
      addProject,
      updateProject,
      deleteProject,
      activities,
      addActivity,
      updateActivity,
      deleteActivity,
      communities,
      addCommunity,
      updateCommunity,
      deleteCommunity,
      newMembers,
      publicProfiles,
      setPublicProfiles,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
