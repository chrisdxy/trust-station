"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

// 分享关系建立：当已登录用户通过分享链接访问时，自动建立上下线关系
export function ShareRelationship({ shareCode }: { shareCode: string }) {
  const { user } = useAuth();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || !user?.id || !shareCode) return;
    tracked.current = true;

    fetch("/api/share/relationship", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareCode, visitorId: user.id }),
    }).catch(() => {});
  }, [user?.id, shareCode]);

  return null;
}
