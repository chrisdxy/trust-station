"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window { wx: any; }
}

let wxConfigured = false;
let wxTimer: ReturnType<typeof setInterval> | null = null;

export function WeChatShareSetup({
  title,
  description,
  link,
  imageUrl
}: {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
}) {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shareLink = link || window.location.href;
    const shareTitle = title || "正道驿站";
    const shareDesc = description || "全球商业信任共建社区";
    const shareImg = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`) : `${window.location.origin}/uploads/logo.jpg`;

    const updateShareData = () => {
      const data = { title: shareTitle, desc: shareDesc, link: shareLink, imgUrl: shareImg };
      try {
        window.wx?.updateAppMessageShareData?.(data);
        window.wx?.updateTimelineShareData?.(data);
      } catch {}
    };

    // 如果已配置过，直接更新分享数据
    if (wxConfigured && window.wx) {
      window.wx.ready(updateShareData);
      return;
    }

    // 等待 wx 加载并配置一次
    const waitForWx = () => {
      if (!window.wx || wxConfigured) return;
      wxConfigured = true;

      const url = window.location.href.split("#")[0];
      fetch(`/api/wechat/js-config?url=${encodeURIComponent(url)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.success || !mountedRef.current) return;
          window.wx.config({
            debug: false,
            appId: data.appId,
            timestamp: data.timestamp,
            nonceStr: data.nonceStr,
            signature: data.signature,
            jsApiList: ["updateAppMessageShareData", "updateTimelineShareData", "onMenuShareAppMessage", "onMenuShareTimeline"]
          });
          window.wx.ready(() => {
            updateShareData();
            // 每次用户点击分享时重新设置数据
            try { window.wx?.onMenuShareAppMessage?.(updateShareData); } catch {}
            try { window.wx?.onMenuShareTimeline?.(updateShareData); } catch {}
          });
          window.wx.error((err: any) => console.warn("wx.config error:", err));
        })
        .catch(() => {});
    };

    // 立即尝试，如果 wx 未加载则轮询
    waitForWx();
    if (!wxConfigured && !wxTimer) {
      wxTimer = setInterval(() => {
        waitForWx();
        if (wxConfigured && wxTimer) { clearInterval(wxTimer); wxTimer = null; }
      }, 500);
      // 10秒后停止轮询
      setTimeout(() => { if (wxTimer) { clearInterval(wxTimer); wxTimer = null; } }, 10000);
    }

    return () => {
      // 组件卸载时更新分享数据回默认值
      if (mountedRef.current) return;
      try {
        const defaultData = { title: "正道驿站", desc: "全球商业信任共建社区", link: window.location.href, imgUrl: window.location.origin + "/uploads/logo.jpg" };
        window.wx?.updateAppMessageShareData?.(defaultData);
        window.wx?.updateTimelineShareData?.(defaultData);
      } catch {}
    };
  }, [title, description, link, imageUrl]);

  return null;
}
