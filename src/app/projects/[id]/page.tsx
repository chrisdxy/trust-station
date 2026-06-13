import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getProject(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://myfriends.vip';
    const res = await fetch(`${baseUrl}/api/projects?id=${id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (data.success) return data.project || data;
    return null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) return { title: '项目未找到 - 正道驿站' };
  const title = p.title || '项目详情 - 正道驿站';
  const desc = (p.summary || p.description || '').replace(/<[^>]*>/g, '').slice(0, 200) || '全球商业信任共建社区';
  const img = p.coverImage ? (p.coverImage.startsWith('http') ? p.coverImage : `https://myfriends.vip${p.coverImage}`) : 'https://myfriends.vip/uploads/logo.jpg';
  return { title, description: desc, openGraph: { title, description: desc, images: [{ url: img, width: 1200, height: 630 }] } };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const safeDate = (d: string | null | undefined) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN');
  };
  const getShortId = (id: string) => 'PRJ-' + id.replace(/-/g, '').slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 mb-6">
          ← 返回项目中心
        </Link>

        {/* 项目封面 */}
        {project.coverImage && (
          <div className="rounded-2xl overflow-hidden mb-6 shadow-md">
            <img src={project.coverImage} alt={project.title} className="w-full h-64 object-cover" />
          </div>
        )}

        {/* 标题 + 元信息 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
            <span>{project.creatorName || '未知用户'}</span>
            <span>{safeDate(project.createdAt || project.date)}</span>
            {project.location && <span>{project.location}</span>}
            {project.industry && <span>{project.industry}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-mono">
              ID: {getShortId(project.id)}
            </span>
            {project.types?.map((t: string) => (
              <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded">{t}</span>
            ))}
            {project.isDueDiligence && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">尽调</span>}
          </div>
        </div>

        {/* 项目简介 */}
        {project.summary && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">项目简介</h2>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{project.summary}</p>
          </div>
        )}

        {/* 项目详情 */}
        {project.description && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">项目详情</h2>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: project.description }} />
          </div>
        )}

        {/* 尽调详情 */}
        {project.isDueDiligence && project.dueDiligenceDetails && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-blue-100 dark:border-blue-800 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">尽调详情</h2>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: project.dueDiligenceDetails }} />
          </div>
        )}
      </div>
    </div>
  );
}
