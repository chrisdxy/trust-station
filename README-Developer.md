# 正道驿站 (Trust Station) — 开发者文档

## 一、项目概述

**正道驿站**是一个社区关系管理平台，支持用户管理、活动报名、调解服务、合作伙伴管理、AI 工具、授权管理等核心功能。

| 属性 | 值 |
|------|-----|
| 项目名称 | 正道驿站 / Trust Station |
| 部署域名 | myfriends.vip |
| 框架 | Next.js 15 + React 19 |
| CSS | Tailwind CSS v3 + shadcn/ui |
| 数据库 | MySQL（腾讯云 CDB，云数据库） |
| 认证 | JWT + 微信 OAuth |
| 短信 | 腾讯云短信 |
| 进程管理 | PM2（端口 5000，Nginx 反代 80） |
| 构建打包 | tsup（server.ts → dist/server.js） |

---

## 二、技术栈详解

### 前端
- **React 19** + **Next.js 15**（App Router，非 standalone 模式）
- **Tailwind CSS v3**（v4 已废弃，降级到 v3）
- **shadcn/ui** + **Radix UI** 组件库
- **Lucide React** 图标
- **Framer Motion** 动画
- **Recharts** 图表
- **react-hook-form** + **Zod** 表单验证
- **Sonner** 消息提示

### 后端
- 自定义 HTTP 服务器（`src/server.ts`），非 Next.js standalone
- MySQL 直连（`mysql2/promise`，无 ORM，直接写 SQL）
- JWT 认证（`jsonwebtoken`）
- 微信 OAuth 登录
- 腾讯云短信（`tencentcloud-sdk-nodejs-sms`）
- 阿里云 SMS 备用（`@alicloud/pop-core`）
- AWS S3 / 腾讯云 COS 文件存储（`@aws-sdk/client-s3`）

### 工具
- **tsup** 打包 server.ts → dist/server.js
- **Drizzle ORM**（已引入但未使用，迁移时可考虑）
- ESLint + TypeScript

---

## 三、目录结构

```
trust station/
├── src/
│   ├── app/                      # Next.js App Router 页面和 API
│   │   ├── (marketing)/          # 营销页面（about, login, register 等）
│   │   ├── admin/               # 管理后台（stats, users, settings 等）
│   │   ├── api/                  # REST API 路由
│   │   │   ├── auth/            # 认证相关（login, register, wechat-callback 等）
│   │   │   ├── admin/           # 管理端 API
│   │   │   ├── activities/      # 活动 API
│   │   │   ├── profiles/        # 用户资料 API
│   │   │   ├── records/         # 记录 API
│   │   │   ├── share/           # 分享链接 API
│   │   │   └── ...
│   │   ├── activities/
│   │   ├── communities/
│   │   ├── mediation/
│   │   ├── profile/
│   │   ├── projects/
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                  # shadcn/ui 基础组件
│   │   ├── layout/              # 布局组件（Sidebar, Header 等）
│   │   └── ...
│   ├── lib/                     # 工具函数
│   │   ├── db.ts                # MySQL 连接池
│   │   ├── utils.ts             # cn() 工具
│   │   ├── verifyCode.ts        # 短信验证码
│   │   ├── sendSms.ts           # 腾讯云 SMS 发送
│   │   └── shared-data.ts       # 共享数据
│   ├── data/
│   │   └── consensus.ts         # 平台理念/共识数据
│   ├── hooks/                   # React Hooks
│   ├── server.ts                # 自定义 Node.js 服务器入口
│   └── app/globals.css          # 全局样式 + CSS 变量
│
├── scripts/                     # 运维脚本
│   ├── build.cjs                # 构建脚本（next build + tsup）
│   ├── dev.cjs                  # 开发启动脚本
│   ├── run-migration.js         # SQL 迁移执行器
│   ├── seed-ai-categories.js   # AI 分类初始化
│   ├── check-admin-users.ts     # 检查管理员账号
│   └── *.sql                    # 数据库迁移 SQL
│
├── public/                      # 静态资源
│
├── dist/                        # tsup 输出（server.js）
├── ecosystem.config.js          # PM2 配置
├── next.config.js               # Next.js 配置
├── postcss.config.mjs           # PostCSS 配置（tailwindcss v3）
├── tailwind.config.js           # Tailwind v3 配置
├── tsconfig.json
├── package.json
├── package-lock.json
├── .env                         # 环境变量（不上传 git）
├── make_deploy_v5.py            # 打包部署脚本
└── deploy-package-v5.tar.gz     # 部署包（打包后生成）
```

---

## 四、环境变量（.env）

> **警告**：`.env` 包含数据库密码等敏感信息，**不要**提交到代码仓库。

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `DB_HOST` | MySQL 主机 | `sh-cynosdbmysql-grp-xxx.sql.tencentcdb.com` |
| `DB_PORT` | MySQL 端口 | `20683` |
| `DB_USER` | 数据库用户 | `Administrator` |
| `DB_PASSWORD` | 数据库密码 | `xxx` |
| `DB_NAME` | 数据库名 | `zhengdao` |
| `JWT_SECRET` | JWT 签名密钥 | 自定义字符串 |
| `SMS_ACCESS_KEY` | 腾讯云 SMS 密钥 | 同 SecretId |
| `SMS_SIGNATURE` | 短信签名 | `正道驿站` |
| `WECHAT_APPID` | 微信 AppID | `wx132561151d9c6e02` |
| `WECHAT_APPSECRET` | 微信 AppSecret | `xxx` |
| `NEXT_PUBLIC_WECHAT_APPID` | 前端用 AppID | 同上 |

---

## 五、数据库

### 连接方式
```typescript
// src/lib/db.ts
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});
```

**注意**：项目**未使用 ORM**（Drizzle 已引入但未激活），所有数据库操作直接写 SQL。推荐后续迁移时启用 Drizzle ORM。

### 核心表（参考 SQL 迁移文件）

| 表名 | 说明 |
|------|------|
| `users` | 用户主表 |
| `profiles` | 用户资料 |
| `activities` | 活动 |
| `communities` | 社区 |
| `mediations` | 调解记录 |
| `partners` | 合作伙伴 |
| `relationships` | 关系 |
| `records` | 记录 |
| `share_links` | 分享链接 |
| `share_clicks` | 分享点击统计 |
| `categories` | 分类（AI 工具等） |
| `ai_tools` | AI 工具 |

### 运行 SQL 迁移
```bash
node scripts/run-migration.js scripts/xxx.sql
```

---

## 六、API 设计

所有 API 均位于 `src/app/api/`，采用 **App Router Route Handlers**（非 Pages Router）。

### 认证 API（`/api/auth/`）
| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/wechat-login` | GET | 微信扫码登录 |
| `/api/auth/wechat-callback` | GET | 微信回调 |
| `/api/auth/send-code` | POST | 发送手机验证码 |
| `/api/auth/verify-code` | POST | 验证验证码 |
| `/api/auth/complete-profile` | POST | 完善资料 |
| `/api/auth/forgot-password` | POST | 忘记密码 |
| `/api/auth/reset-password` | POST | 重置密码 |
| `/api/auth/admin-login` | POST | 管理员登录 |

### 业务 API
| 路由 | 说明 |
|------|------|
| `/api/activities/*` | 活动 CRUD |
| `/api/profiles/*` | 用户资料 |
| `/api/communities/*` | 社区 |
| `/api/mediations/*` | 调解 |
| `/api/partners/*` | 合作伙伴 |
| `/api/projects/*` | 项目 |
| `/api/records/*` | 记录 |
| `/api/share/*` | 分享链接 |
| `/api/authorizations/*` | 授权 |
| `/api/admin/*` | 管理端 API |

### API 返回格式
```typescript
// 成功
{ data: T, message: "ok" }
// 错误
{ error: string, message: string }
```

---

## 七、构建与部署

### 本地构建
```bash
npm run build
# 等价于：
# npx next build  +  npx tsup src/server.ts --format cjs
```

### 打包部署
```bash
python make_deploy_v5.py
# 生成 deploy-package-v5.tar.gz
```

### 服务器部署
```bash
# 1. 上传 tar.gz 包
# 2. 解压并执行
cd ~ && tar -xzf deploy-package-v5.tar.gz
chmod +x server-setup.sh && ./server-setup.sh

# 3. 重启（如需要）
pm2 restart zhengdao

# 4. 检查状态
pm2 status
curl -I http://localhost:5000
```

### PM2 配置
```javascript
// ecosystem.config.js
{
  name: 'zhengdao',
  script: 'dist/server.js',
  cwd: '/root',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  env: {
    NODE_ENV: 'production',
    COZE_PROJECT_ENV: 'PROD',
    PORT: 5000,  // PM2 内部端口
  }
}
```

### Nginx 反代
```nginx
server {
    listen 80;
    server_name myfriends.vip;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 八、开发规范

### CSS / Tailwind 规范（重要）

本项目使用 **Tailwind CSS v3**，**禁止使用 v4 语法**：

| v4 语法（禁止） | v3 替代 |
|----------------|---------|
| `@import 'tailwindcss'` | `@tailwind base; @tailwind components; @tailwind utilities;` |
| `outline-ring` | `ring-2 ring-ring` |
| `ring-ring/50` | `ring-2 ring-ring` |
| `border-ring` | `ring-2 ring-ring` |
| `aria-invalid:ring-destructive/20` | `aria-invalid:ring-2 aria-invalid:ring-destructive` |
| `@custom-variant dark(&)` | `dark:` |
| `@theme inline {}` | CSS 变量定义在 `:root` / `.dark` 中 |

**任何包含 `ring/`，`outline-ring`，`@custom-variant`，`@theme` 的代码都是 v4 语法，必须在提交前替换。**

### 组件开发
- 优先使用 shadcn/ui 组件（`src/components/ui/`）
- 新增 UI 组件：`npx shadcn@latest add <component-name>`
- 自定义组件放在 `src/components/` 相应子目录

### API 开发
- 位于 `src/app/api/[domain]/[action]/route.ts`
- 使用 `NextRequest` / `NextResponse`
- 所有异步操作使用 `try/catch`，统一错误返回

---

## 九、已知问题与注意事项

1. **Tailwind v4 降级**：原项目使用 v4，与 Next.js 静态页渲染不兼容，已降级到 v3。所有 UI 组件已手动转换 v4 语法 → v3 语法。
2. **无 ORM**：数据库直接写 SQL，建议后续引入 Drizzle ORM 提升类型安全和迁移体验。
3. **.env 不在部署包里**：`make_deploy_v5.py` 会复制 `.env`，但需确认服务器上有最新的 `.env`。
4. **微信登录**：需要微信公众号后台配置回调域名（`myfriends.vip/api/auth/wechat-callback`）。
5. **数据库迁移**：腾讯云 CDB 自建表可通过 `scripts/run-migration.js` 执行。

---

## 十、快速命令参考

```bash
# 开发
npm run dev          # 启动开发服务器（端口 5000）

# 构建
npm run build        # 生产构建（next build + tsup）

# 类型检查
npx tsc --noEmit

# 代码检查
npm run lint

# PM2
pm2 status           # 查看状态
pm2 restart zhengdao
pm2 logs zhengdao    # 查看日志

# 数据库
node scripts/run-migration.js scripts/xxx.sql
node scripts/check-admin-users.ts
```
