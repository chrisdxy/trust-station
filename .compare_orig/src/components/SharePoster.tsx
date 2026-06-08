"use client";

import { useRef, useState, useEffect } from "react";
import QRCode from "qrcode";
import { Download, Loader2 } from "lucide-react";

interface SharePosterProps {
  title: string;
  description?: string;
  coverImage?: string;
  shareUrl: string;
  type: "project" | "activity" | "community" | "card";
  className?: string;
}

const typeColors: Record<string, string> = {
  project: "#10b981",
  activity: "#8b5cf6",
  community: "#3b82f6",
  card: "#f59e0b",
};

const typeLabels: Record<string, string> = {
  project: "项目",
  activity: "活动",
  community: "共同体",
  card: "名片",
};

export function SharePoster({ title, description, coverImage, shareUrl, type, className = "" }: SharePosterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [posterReady, setPosterReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // 生成二维码
  useEffect(() => {
    if (!shareUrl) return;
    QRCode.toDataURL(shareUrl, { width: 120, margin: 1, color: { dark: "#1e293b", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setError("二维码生成失败"));
  }, [shareUrl]);

  // 绘制海报
  const generatePoster = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    setError("");

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 500;
    const H = 700;
    canvas.width = W;
    canvas.height = H;

    const color = typeColors[type] || "#10b981";

    // 背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // 顶部色条
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, 6);

    // 封面图
    let coverY = 6;
    if (coverImage) {
      try {
        const img = await loadImage(fixImageUrl(coverImage));
        const coverH = 240;
        ctx.drawImage(img, 0, coverY, W, coverH);
        coverY += coverH + 16;
      } catch {
        coverY += 16;
      }
    } else {
      coverY += 16;
    }

    // 类型标签
    ctx.fillStyle = color;
    ctx.font = "bold 14px sans-serif";
    const tagW = ctx.measureText(typeLabels[type] || type).width + 20;
    roundedRect(ctx, 20, coverY, tagW, 28, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(typeLabels[type] || type, 20 + tagW / 2, coverY + 19);
    ctx.textAlign = "left";

    // 标题
    const titleY = coverY + 48;
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 22px sans-serif";
    const titleLines = wrapText(ctx, title, W - 40);
    titleLines.forEach((line, i) => {
      ctx.fillText(line, 20, titleY + i * 32);
    });

    // 描述
    let descY = titleY + titleLines.length * 32 + 16;
    if (description) {
      ctx.fillStyle = "#64748b";
      ctx.font = "15px sans-serif";
      const descLines = wrapText(ctx, description.slice(0, 100), W - 40);
      descLines.forEach((line, i) => {
        if (i < 2) ctx.fillText(line, 20, descY + i * 24);
      });
      descY += Math.min(descLines.length, 2) * 24 + 20;
    }

    // 底部分割线
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(20, Math.max(descY, H - 180));
    ctx.lineTo(W - 20, Math.max(descY, H - 180));
    ctx.stroke();

    // 正道驿站 品牌
    const bottomY = Math.max(descY + 10, H - 170);
    ctx.fillStyle = "#64748b";
    ctx.font = "13px sans-serif";
    ctx.fillText("正道驿站 · 全球商业信任共建社区", 20, bottomY + 20);
    ctx.fillText("扫码查看详情，加入我们", 20, bottomY + 42);

    // 二维码
    if (qrDataUrl) {
      try {
        const qrImg = await loadImage(qrDataUrl);
        const qrSize = 110;
        ctx.drawImage(qrImg, W - 130, bottomY - 10, qrSize, qrSize);
      } catch {}
    }

    setPosterReady(true);
    setGenerating(false);
  };

  // 加载海报生成
  useEffect(() => {
    if (!qrDataUrl) return;
    generatePoster();
  }, [qrDataUrl]);

  // 下载
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${title || "分享"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <button
        onClick={handleDownload}
        disabled={!posterReady || generating}
        className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
          posterReady
            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
            : "bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
        }`}
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 animate-spin" />生成海报中...</>
        ) : posterReady ? (
          <><Download className="w-4 h-4" />下载分享图片</>
        ) : (
          <><Download className="w-4 h-4" />准备中...</>
        )}
      </button>
    </div>
  );
}

// 工具函数
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fixImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return window.location.origin + url;
  return url;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
