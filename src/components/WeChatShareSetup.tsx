"use client";

import { useEffect } from "react";

declare global {
  interface Window { wx: any; }
}

export function WeChatShareSetup({
  title,
  description,
  link,
  imageUrl,
}: {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const shareLink = link || window.location.href;
    const shareTitle = title || "正道驿站";
    const shareDesc = description || "全球商业信任共建社区";
    const shareImg = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${window.location.origin}${imageUrl}`) : `${window.location.origin}/logo.jpg`;

    const configShare = () => {
      const shareData = {
        title: shareTitle,
        desc: shareDesc,
        link: shareLink,
        imgUrl: shareImg,
      };
      try {
        window.wx?.updateAppMessageShareData?.(shareData);
        window.wx?.updateTimelineShareData?.(shareData);
      } catch (e) { /* ignore */ }
    };

    const doSetup = () => {
      if (!window.wx) {
        // WeChat JSSDK not loaded, skip
        return;
      }

      fetch(`/api/wechat/js-config?url=${encodeURIComponent(window.location.href.split("#")[0])}`)
        .then(r => r.json())
        .then(data => {
          if (!data.success) return;
          window.wx.config({
            debug: false,
            appId: data.appId,
            timestamp: data.timestamp,
            nonceStr: data.nonceStr,
            signature: data.signature,
            jsApiList: [
              "updateAppMessageShareData",
              "updateTimelineShareData",
              "onMenuShareAppMessage",
              "onMenuShareTimeline",
            ],
          });
          window.wx.ready(configShare);
          window.wx.error((err: any) => console.warn("wx.config error:", err));
        })
        .catch(() => {});
    };

    doSetup();
  }, [title, description, link, imageUrl]);

  return null;
}
