"use client";

import { useEffect } from "react";

declare global {
  interface Window { wx: any; }
}

interface WeChatShareConfig {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
}

// 在落地页和目标详情页配置微信分享卡片
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
    if (!window.wx) return;

    const shareLink = link || window.location.href;
    const shareTitle = title || "正道驿站";
    const shareDesc = description || "全球商业信任共建社区";
    const shareImg = imageUrl || `${window.location.origin}/logo.jpg`;

    const configShare = () => {
      const shareData: WeChatShareConfig = {
        title: shareTitle,
        desc: shareDesc,
        link: shareLink,
        imgUrl: shareImg,
      };
      try {
        window.wx.updateAppMessageShareData(shareData); // 分享给朋友/群
        window.wx.updateTimelineShareData(shareData);    // 分享到朋友圈
      } catch (e) {
        // WeChat SDK 方法可能不可用，忽略
      }
    };

    // 如果已经 config 过
    if (window.wx.ready) {
      window.wx.ready(configShare);
    }

    // 从 URL 获取 JS-SDK 配置
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
          jsApiList: ["updateAppMessageShareData", "updateTimelineShareData"],
        });
        window.wx.ready(configShare);
        window.wx.error((err: any) => console.warn("wx.config error:", err));
      })
      .catch(() => {});
  }, [title, description, link, imageUrl]);

  return null;
}
