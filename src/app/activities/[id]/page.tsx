import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getActivity(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://myfriends.vip';
    const res = await fetch(`${baseUrl}/api/activities/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return data.success ? data.activity : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const act = await getActivity(id);
  const title = act?.title || '活动详情 - 正道驿站';
  const desc = (act?.description || '').replace(/<[^>]*>/g, '').slice(0, 200) || '全球商业信任共建社区';
  const img = act?.cover_image ? (act.cover_image.startsWith('http') ? act.cover_image : `https://myfriends.vip${act.cover_image}`) : 'https://myfriends.vip/uploads/logo.jpg';
  return { title, description: desc, openGraph: { title, description: desc, images: [img] } };
}

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const act = await getActivity(id);
  if (!act) notFound();

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/activities" className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mb-6">
          ← 返回活动中心
        </Link>

        {act.cover_image && (
          <div className="rounded-2xl overflow-hidden mb-6 shadow-md">
            <img src={act.cover_image} alt={act.title} className="w-full h-64 object-cover" />
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{act.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
            {act.organizer_name_selected || act.organizer_name && <span>{act.organizer_name_selected || act.organizer_name}</span>}
            {act.start_time && <span>{fmtDate(act.start_time)}</span>}
            {act.location && <span>{act.location}</span>}
            {act.status && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                act.status === 'upcoming' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                act.status === 'ongoing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                act.status === 'finished' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' :
                'bg-slate-100 text-slate-600'
              }`}>
                {act.status === 'upcoming' ? '即将开始' : act.status === 'ongoing' ? '进行中' : act.status === 'finished' ? '已结束' : act.status}
              </span>
            )}
          </div>
        </div>

        {act.description && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">活动详情</h2>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: act.description }} />
          </div>
        )}
      </div>
    </div>
  );
}
