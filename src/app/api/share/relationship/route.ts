import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 建立上下线关系（分享者邀请）
export async function POST(request: NextRequest) {
  try {
    const { visitorId, inviterId, shareCode } = await request.json();

    if (!visitorId || !inviterId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 不能自己邀请自己
    if (visitorId === inviterId) {
      return NextResponse.json(
        { success: false, error: '不能邀请自己' },
        { status: 400 }
      );
    }

    // 检查是否已存在关系
    const [existing] = await pool.query(
      `SELECT id FROM relationships 
       WHERE user_id = ? AND partner_id = ? AND type = 'invite'
       LIMIT 1`,
      [inviterId, visitorId]
    ) as any[];

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: '关系已存在' });
    }

    // 建立邀请关系（inviter是上线，visitor是下线）
    await pool.query(
      `INSERT INTO relationships (user_id, partner_id, type, status, source, share_code, created_at)
       VALUES (?, ?, 'invite', 'active', 'share_link', ?, NOW())`,
      [inviterId, visitorId, shareCode || null]
    );

    // 同时建立双向关系
    await pool.query(
      `INSERT INTO relationships (user_id, partner_id, type, status, source, share_code, created_at)
       VALUES (?, ?, 'follower', 'active', 'share_link', ?, NOW())`,
      [visitorId, inviterId, shareCode || null]
    );

    return NextResponse.json({
      success: true,
      message: '上下线关系建立成功',
    });
  } catch (error) {
    console.error('建立上下线关系错误:', error);
    return NextResponse.json(
      { success: false, error: '建立关系失败' },
      { status: 500 }
    );
  }
}
