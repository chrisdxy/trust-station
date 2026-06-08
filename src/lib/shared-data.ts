// 共享数据存储 - 所有 API 共享的内存数据
// 这个文件确保所有 API 路由访问同一个数据源

declare global {
  var sharedUsers: Map<string, { 
    phone?: string; 
    password?: string; 
    nickname?: string; 
    realName?: string;
    openid?: string;
    createdAt: Date 
  }>;
  var sharedUserProfiles: Map<string, { 
    phone: string; 
    nickname?: string; 
    realName?: string;
    avatar?: string;
    createdAt: Date;
    updatedAt?: Date;
  }>;
  var sharedVerificationCodes: Map<string, { code: string; expiresAt: Date; type: string }>;
  var sharedWechatUsers: Map<string, {
    openid: string;
    nickname?: string;
    realName?: string;
    phone?: string;
    createdAt: Date;
  }>;
  var sharedTestUsersInitialized: boolean;
}

// 初始化共享数据存储
if (!global.sharedUsers) {
  global.sharedUsers = new Map();
}

if (!global.sharedUserProfiles) {
  global.sharedUserProfiles = new Map();
}

if (!global.sharedVerificationCodes) {
  global.sharedVerificationCodes = new Map();
}

if (!global.sharedWechatUsers) {
  global.sharedWechatUsers = new Map();
}

// 初始化测试用户
function initSharedTestUsers() {
  if (global.sharedTestUsersInitialized) {
    return;
  }
  
  const testUsers = [
    { phone: '13800138001', nickname: '张三', realName: '张明' },
    { phone: '13800138002', nickname: '李四', realName: '李华' },
    { phone: '13800138003', nickname: '王五', realName: '王伟' },
    { phone: '13900139001', nickname: '赵六', realName: '赵强' },
    { phone: '13900139002', nickname: '孙七', realName: '孙丽' },
    { phone: '13700137001', nickname: '周八', realName: '周伟' }
  ];
  
  testUsers.forEach(user => {
    global.sharedUsers!.set(user.phone, {
      phone: user.phone,
      nickname: user.nickname,
      realName: user.realName,
      createdAt: new Date()
    });
    global.sharedUserProfiles!.set(user.phone, {
      phone: user.phone,
      nickname: user.nickname,
      realName: user.realName,
      createdAt: new Date()
    });
  });
  
  global.sharedTestUsersInitialized = true;
}

// 导出初始化函数
export { initSharedTestUsers };

// 导出类型
export type SharedUser = {
  phone?: string;
  password?: string;
  nickname?: string;
  realName?: string;
  openid?: string;
  createdAt: Date;
};

export type SharedUserProfile = {
  phone: string;
  nickname?: string;
  realName?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt?: Date;
};
