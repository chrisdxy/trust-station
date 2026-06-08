import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 三列链接 - 同一行 */}
        <div className="flex justify-center gap-8 mb-4 text-sm">
          <Link href="/about" className="hover:text-amber-400 transition-colors">
            关于我们
          </Link>
          <Link href="/privacy" className="hover:text-amber-400 transition-colors">
            隐私政策
          </Link>
        </div>
        {/* 版权信息 */}
        <p className="text-center text-slate-400 text-xs">
          © 2026 正道驿站
        </p>
      </div>
    </footer>
  );
}
