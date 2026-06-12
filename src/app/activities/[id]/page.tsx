import { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
  redirect(`/activities?view=${id}`);
}
