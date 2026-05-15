"use client";

import { useState } from "react";
import { Share2, User, X, ExternalLink, Copy, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ShareButtonProps {
  targetType: "project" | "activity" | "community" | "card";
  targetId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  className?: string;
}

interface ShareData {
  shareUrl: string;
  sharer: {
    id: string;
    name: string;
    avatar?: string;
    inviteCode?: string;
  } | null;
}

export function ShareButton({
  targetType,
  targetId,
  title,
  description = "",
  imageUrl = "",
  className = "",
}: ShareButtonProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  const handleShare = async () => {
    if (!user) {
      alert("请先登录");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          targetType,
          targetId,
          title,
          description,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShareData({
          shareUrl: data.shareUrl,
          sharer: data.sharer,
        });
        setShowCard(true);
        setCopied(false);
      } else {
        alert("生成分享链接失败：" + (data.error || "未知错误"));
      }
    } catch (err) {
      alert("生成分享链接失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shareData?.shareUrl) {
      await navigator.clipboard.writeText(shareData.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    community: { label: '共同体', color: 'bg-blue-500' },
    project:   { label: '项目', color: 'bg-green-500' },
    activity:  { label: '活动', color: 'bg-purple-500' },
    card:      { label: '个人名片', color: 'bg-amber-500' },
  };
  const typeInfo = typeLabels[targetType] || { label: '内容', color: 'bg-slate-500' };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={loading}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
          copied
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        } ${className}`}
        title="分享内容"
      >
        <Share2 className="w-4 h-4" />
        {loading ? "生成中..." : "分享"}
      </button>

      {/* 分享卡片弹窗 */}
      {showCard && shareData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCard(false)}>
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">分享 {typeInfo.label}</h3>
              <button onClick={() => setShowCard(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 分享者信息 */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
              {shareData.sharer?.avatar ? (
                <img src={shareData.sharer.avatar} alt={shareData.sharer.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-slate-500">分享自</p>
                <p className="font-medium text-slate-900 dark:text-white">{shareData.sharer?.name || '正道用户'}</p>
              </div>
              {shareData.sharer?.inviteCode && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">邀请码</p>
                  <p className="font-mono text-sm font-bold text-emerald-600">{shareData.sharer.inviteCode}</p>
                </div>
              )}
            </div>

            {/* 内容预览卡片 */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 ${typeInfo.color} text-white text-xs rounded`}>{typeInfo.label}</span>
                <span className="text-xs text-slate-400">正道驿站</span>
              </div>
              
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1 line-clamp-2">{title}</h4>
              {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{description}</p>
              )}

              {imageUrl && (
                <div className="rounded-lg overflow-hidden mb-4">
                  <img src={imageUrl} alt={title} className="w-full h-32 object-cover" />
                </div>
              )}

              {/* 分享链接 */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-4">
                <p className="text-xs text-slate-400 mb-1">分享链接</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-mono truncate">{shareData.shareUrl}</p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                    copied
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "已复制" : "复制链接"}
                </button>
                <a
                  href={shareData.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  预览
                </a>
              </div>

              {/* 提示 */}
              <p className="text-xs text-slate-400 text-center mt-3">
                链接已包含您的身份信息，阅读者访问时会自动建立上下线关系
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
