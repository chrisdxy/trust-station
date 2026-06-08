"use client";

import { useEffect, useRef } from "react";

// 记录分享点击（落地页加载时自动记录）
export function ShareClickTracker({
  shareCode,
}: {
  shareCode: string;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    fetch("/api/share/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shareCode,
        userAgent: navigator.userAgent,
        referer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [shareCode]);

  return null;
}

// 查看详情按钮（记录点击后跳转目标页，关系在目标页建立）
export function ShareVisitButton({
  redirectUrl,
  children,
}: {
  redirectUrl: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={redirectUrl}
      className="block w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl text-center transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
    >
      {children || "查看详情"}
    </a>
  );
}
