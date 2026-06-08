import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import { User, Users, MapPin, Star, ExternalLink } from 'lucide-react';
import { ShareClickTracker, ShareVisitButton } from '@/components/ShareClickTracker';
import { WeChatShareSetup } from '@/components/WeChatShareSetup';
import { ShareRelationship } from '@/components/ShareRelationship';

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ inviter?: string }>;
}

// 服务端获取分享信息
async function getShareInfo(code: string) {
  try {
    const [rows] = await pool.query(
      `SELECT sl.*, u.display_name as sharer_name, u.real_name as sharer_real_name,
              u.avatar_url as sharer_avatar
       FROM share_links sl
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.share_code = ? LIMIT 1`,
      [code]
    ) as any[];
    return rows && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

// 服务端获取目标内容详情
async function getTargetContent(targetType: string, targetId: string) {
  try {
    if (targetType === 'community') {
      const [rows] = await pool.query(
        'SELECT name as title, description, cover_image FROM communities WHERE id = ?',
        [targetId]
      ) as any[];
      return rows?.[0] || null;
    } else if (targetType === 'project') {
      const [rows] = await pool.query(
        'SELECT title, description, cover_image FROM projects WHERE id = ?',
        [targetId]
      ) as any[];
      return rows?.[0] || null;
    } else if (targetType === 'activity') {
      const [rows] = await pool.query(
        'SELECT title, description, cover_image FROM activities WHERE id = ?',
        [targetId]
      ) as any[];
      return rows?.[0] || null;
    } else if (targetType === 'card') {
      const [rows] = await pool.query(
        `SELECT COALESCE(real_name, display_name) as title, bio as description, avatar_url as cover_image
         FROM users WHERE id = ?`,
        [targetId]
      ) as any[];
      return rows?.[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function getRedirectUrl(share: any): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://myfriends.vip';
  switch (share.target_type) {
    case 'community': return `${baseUrl}/communities?id=${share.target_id}`;
    case 'project':   return `${baseUrl}/projects?id=${share.target_id}`;
    case 'activity':  return `${baseUrl}/activities?id=${share.target_id}`;
    case 'card':      return `${baseUrl}/profile?id=${share.target_id}`;
    default:          return baseUrl;
  }
}

// 动态生成 OG 标签（服务端渲染，微信爬虫可读取）
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const share = await getShareInfo(resolvedParams.code);
  if (!share) {
    return { title: '分享链接不存在 - 正道驿站' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://myfriends.vip';
  const shareUrl = `${baseUrl}/share/${share.share_code}?inviter=${share.user_id}`;
  const imageUrl = share.image_url || share.cover_image || `${baseUrl}/og-default.png`;
  const sharerName = share.sharer_real_name || share.sharer_name || '正道用户';

  return {
    title: `${share.title || '正道驿站'} - ${sharerName}邀请您加入`,
    description: share.description || '全球商业信任共建社区',
    openGraph: {
      title: share.title || '正道驿站',
      description: `${sharerName}邀请您加入 - ${share.description || '全球商业信任共建社区'}`,
      url: shareUrl,
      siteName: '正道驿站',
      images: [{ url: imageUrl, width: 1200, height: 630, alt: share.title || '正道驿站' }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: share.title || '正道驿站',
      description: share.description || '全球商业信任共建社区',
      images: [imageUrl],
    },
  };
}

export default async function ShareLandingPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const share = await getShareInfo(resolvedParams.code);
  
  if (!share) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://myfriends.vip';
  const redirectUrl = getRedirectUrl(share) + (resolvedSearch.inviter ? `&inviter=${resolvedSearch.inviter}` : '');
  const sharerName = share.sharer_real_name || share.sharer_name || '正道用户';
  const targetContent = await getTargetContent(share.target_type, share.target_id);
  const displayTitle = share.title || targetContent?.title || '正道驿站';
  const displayDesc = share.description || targetContent?.description || '全球商业信任共建社区';
  const displayImage = share.image_url || targetContent?.cover_image || null;

  // 类型标签
  const typeLabels: Record<string, { label: string; color: string }> = {
    community: { label: '共同体', color: 'bg-blue-500' },
    project:   { label: '项目', color: 'bg-green-500' },
    activity:  { label: '活动', color: 'bg-purple-500' },
    card:      { label: '个人名片', color: 'bg-amber-500' },
  };
  const typeInfo = typeLabels[share.target_type] || { label: '内容', color: 'bg-slate-500' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <ShareClickTracker shareCode={share.share_code} />
      <WeChatShareSetup title={displayTitle} description={displayDesc} imageUrl={displayImage || undefined} />
      <ShareRelationship shareCode={share.share_code} />
      {/* 主卡片 */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* 顶部渐变条 */}
        <div className={`h-2 ${typeInfo.color}`}></div>
        
        {/* 分享者信息区 */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
          {share.sharer_avatar ? (
            <img 
              src={share.sharer_avatar} 
              alt={sharerName}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
              <User className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">分享自</p>
            <p className="font-semibold text-slate-900 dark:text-white">{sharerName}</p>
          </div>
        </div>

        {/* 内容预览区 */}
        <div className="p-6">
          {/* 类型标签 */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-1 ${typeInfo.color} text-white text-xs font-medium rounded-full`}>
              {typeInfo.label}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Star className="w-3 h-3" />
              正道驿站
            </span>
          </div>

          {/* 标题 */}
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
            {displayTitle}
          </h1>

          {/* 描述 */}
          {displayDesc && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
              {displayDesc}
            </p>
          )}

          {/* 封面图 */}
          {displayImage && (
            <div className="relative mb-4 rounded-xl overflow-hidden shadow-md">
              <img 
                src={displayImage} 
                alt={displayTitle}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
          )}

          {/* 关系提示 */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">
                {sharerName} 邀请您加入正道驿站
              </span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
              加入后可查看 {typeInfo.label} 详情，开启您的商业信任之旅
            </p>
          </div>

          {/* 行动按钮 */}
          <ShareVisitButton redirectUrl={redirectUrl}>
            <ExternalLink className="w-4 h-4" />
            查看详情
          </ShareVisitButton>

          {/* 底部信息 */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              <span>全球商业信任共建社区 · 正道驿站</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
