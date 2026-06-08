"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Profile {
  id: string;
  user_type: 'individual' | 'company';
  display_name: string | null;
  real_name: string | null;
  company_name: string | null;
  legal_rep_name: string | null; // 负责人姓名
  auth_rep_name: string | null; // 代表人姓名
  identity_verified: boolean;
  wallet_address: string | null;
  avatar_url: string | null;
  phone?: string;
  email?: string;
}

interface AuthContextType {
  user: { id: string; phone?: string; email?: string; user_type?: string; display_name?: string | null; real_name?: string | null } | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (phone: string, password: string, userData: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  revalidateSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'login_session_time';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; phone?: string; display_name?: string; nickname?: string; user_type?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // 会话有效期
  const SESSION_DURATION = 30 * 60 * 1000; // 普通会话30分钟
  const REMEMBER_DURATION = 7 * 24 * 60 * 60 * 1000; // 记住我7天

  // 检查会话是否过期
  const isSessionValid = (): boolean => {
    if (typeof window === 'undefined') return false;
    const sessionTime = localStorage.getItem(SESSION_KEY);
    if (!sessionTime) return false;
    const isRemember = localStorage.getItem('remember_me') === 'true';
    const duration = isRemember ? REMEMBER_DURATION : SESSION_DURATION;
    const elapsed = Date.now() - parseInt(sessionTime, 10);
    return elapsed < duration;
  };

  // 刷新会话时间（始终存储起始时间，由 isSessionValid() 根据 remember_me 计算有效期）
  const refreshSession = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, Date.now().toString());
  };

  // 清除会话
  const clearSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('remember_me');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user') || localStorage.getItem('user_data');
      const savedProfile = localStorage.getItem('profile');
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // 微信登录用户：只要 user 存在即视为已登录（login.tsx 已设置7天有效期）
        const isWechatUser = parsedUser.isWechatUser === true;
        if (isWechatUser || isSessionValid()) {
          // 管理员账号也可以登录前台使用普通功能
          // 仅当存在 admin_token 时才视为管理员登录，否则按普通用户处理
          setUser(parsedUser);
          if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
          }
          if (!isWechatUser) refreshSession(); // 普通用户刷新会话时间
        } else {
          // 会话过期，清除数据
          localStorage.removeItem('user');
          localStorage.removeItem('user_data');
          localStorage.removeItem('profile');
          localStorage.removeItem('remember_me');
          localStorage.removeItem('is_admin');
          localStorage.removeItem('admin_role');
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
      }
      setLoading(false);
    }
  }, []);

  // 监听用户活动，自动刷新会话
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    let timeout: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        refreshSession();
      }, 60000); // 每分钟刷新一次会话
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      clearTimeout(timeout);
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  const signIn = async (phone: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error || '登录失败' };
      }

      // 保存用户数据和 token
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('profile', JSON.stringify(data.profile));
      refreshSession();

      setUser(data.user);
      setProfile(data.profile);

      return { success: true };
    } catch (error: any) {
      console.error('登录错误:', error);
      return { success: false, error: error.message || '登录失败' };
    }
  };

  const signUp = async (phone: string, password: string, userData: Partial<Profile>) => {
    try {
      const mockUser = { id: 'user-' + Date.now(), phone };
      const mockProfile: Profile = {
        id: mockUser.id,
        user_type: userData.user_type || 'individual',
        display_name: userData.real_name || userData.display_name || '新用户' + phone.slice(-4),
        real_name: userData.real_name || userData.display_name || null,
        company_name: userData.company_name || null,
        legal_rep_name: userData.legal_rep_name || null,
        auth_rep_name: userData.auth_rep_name || null,
        identity_verified: false,
        wallet_address: null,
        avatar_url: null,
        phone: phone,
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('profile', JSON.stringify(mockProfile));
      refreshSession(); // 记录登录时间
      
      setUser(mockUser);
      setProfile(mockProfile);
      
      return { success: true, token: 'mock-token-' + Date.now() };
    } catch {
      return { success: false, error: '注册失败' };
    }
  };

  // 重新验证会话，从 localStorage 恢复状态
  const revalidateSession = () => {
    if (typeof window === 'undefined') return;
    const savedUser = localStorage.getItem('user') || localStorage.getItem('user_data');
    const savedProfile = localStorage.getItem('profile');
    const sessionTime = localStorage.getItem(SESSION_KEY);
    
    if (savedUser && sessionTime) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
      }
      refreshSession();
    }
  };

  const signOut = async () => {
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    clearSession(); // 清除会话
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    // Mock refresh - in production would fetch from API
  };

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      if (!profile) {
        return { success: false, error: '用户未登录' };
      }
      
      const updatedProfile = { ...profile, ...data };
      localStorage.setItem('profile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      
      return { success: true };
    } catch {
      return { success: false, error: '更新失败' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      revalidateSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
