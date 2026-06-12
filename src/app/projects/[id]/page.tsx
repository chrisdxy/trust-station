import { Metadata } from 'next';
import { redirect } from 'next/navigation';

async function getProject(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://myfriends.vip';
    const res = await fetch(`${baseUrl}/api/projects?id=${id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.success) return data.project || data;
    const res2 = await fetch(`${baseUrl}/api/projects/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data2 = await res2.json();
    return data2.success ? (data2.project || data2) : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProject(id);
  const title = p?.title || p?.name || '项目详情 - 正道驿站';
  const desc = (p?.summary || p?.description || '').replace(/<[^>]*>/g, '').slice(0, 200) || '全球商业信任共建社区';
  const img = p?.coverImage ? (p.coverImage.startsWith('http') ? p.coverImage : `https://myfriends.vip${p.coverImage}`) : 'https://myfriends.vip/uploads/logo.jpg';
  return { title, description: desc, openGraph: { title, description: desc, images: [img] } };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/projects?view=${id}`);
}
