import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getCommunity(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://myfriends.vip';
    const res = await fetch(`${baseUrl}/api/communities/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data.success ? data.community : null;
  } catch { return null; }
}

const categoryLabels: Record<string, string> = {
  entrepreneurship: '创业',
  investment: '投资',
  industry: '行业',
  technology: '科技',
  culture: '文化',
  education: '教育',
  charity: '公益',
  other: '其他',
};

const getShortId = (id: string) => id.length > 8 ? id.slice(0, 8) : id;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = await getCommunity(id);
  const title = c?.name || '共同体详情 - 正道驿站';
  const desc = (c?.summary || c?.description || '').replace(/<[^>]*>/g, '').slice(0, 200) || '全球商业信任共建社区';
  const img = c?.coverImage ? (c.coverImage.startsWith('http') ? c.coverImage : `https://myfriends.vip${c.coverImage}`) : 'https://myfriends.vip/uploads/logo.jpg';
  return { title, description: desc, openGraph: { title, description: desc, images: [img] } };
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCommunity(id);
  if (!c) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/communities" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-6">
          ← 返回共同体
        </Link>

        {/* 封面图 */}
        {c.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-6 shadow-md">
            <img src={c.coverImage} alt={c.name} className="w-full h-64 object-cover" />
          </div>
        )}

        {/* 基本信息 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <div className="flex items-start gap-4">
            {c.coverImage ? (
              <img src={c.coverImage} alt={c.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{c.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono cursor-default">
                  ID: {getShortId(c.id)}
                </span>
                {c.category && (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                    {categoryLabels[c.category] || c.category}
                  </span>
                )}
                {c.industryName && (
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-400">
                    {c.industryName}
                  </span>
                )}
                {!c.isPublic && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-600 dark:text-amber-400">
                    私密
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            {c.ownerName && <span>创建人：{c.ownerName}</span>}
            <span>成员：{c.memberList?.length || c.members || 0} 人</span>
          </div>

          {/* 摘要 */}
          {c.summary && (
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-4">{c.summary}</p>
          )}
        </div>

        {/* 详情描述 */}
        {c.description && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">共同体详情</h2>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: c.description }} />
          </div>
        )}

        {/* 图片列表 */}
        {c.images && c.images.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">活动图片</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {c.images.map((img: string, i: number) => (
                <img key={i} src={img.startsWith('http') ? img : `https://myfriends.vip${img}`} alt={`图片 ${i+1}`} className="w-full h-32 object-cover rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* 社群二维码 */}
        {c.qrCode && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">社群二维码</h2>
            <div className="flex justify-center">
              <img
                src={c.qrCode.startsWith('http') ? c.qrCode : `https://myfriends.vip${c.qrCode}`}
                alt="社群二维码"
                className="w-48 h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
