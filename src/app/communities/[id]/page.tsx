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

        {c.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-6 shadow-md">
            <img src={c.coverImage} alt={c.name} className="w-full h-64 object-cover" />
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{c.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
            {c.ownerName && <span>{c.ownerName}</span>}
            {c.category && <span>{c.category}</span>}
            {c.memberList && <span>{c.memberList.length || c.members} 成员</span>}
          </div>
          {c.summary && (
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.summary}</p>
          )}
        </div>

        {c.description && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">共同体详情</h2>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: c.description }} />
          </div>
        )}
      </div>
    </div>
  );
}
