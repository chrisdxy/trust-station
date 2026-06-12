import { Metadata } from 'next';
import { redirect } from 'next/navigation';

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
  redirect(`/communities?view=${id}`);
}
