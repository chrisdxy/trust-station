import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

// 建立溯源伙伴关系（通过分享链接）
export async function POST(request: NextRequest) {
  try {
    let { visitorId, inviterId, shareCode } = await request.json();

    // 如果提供了 shareCode 但没有 inviterId，从 share_links 查
    if (shareCode && !inviterId) {
      const [rows]: any = await pool.query(
        'SELECT user_id, target_type, target_id, title FROM share_links WHERE share_code = ? LIMIT 1',
        [shareCode]
      );
      if (rows && rows.length > 0) {
        inviterId = rows[0].user_id;
      }
    }

    if (!visitorId || !inviterId) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 不能自己邀请自己
    if (visitorId === inviterId) {
      return NextResponse.json({ success: false, error: '不能邀请自己' }, { status: 400 });
    }

    // 检查是否已存在该分享码对应的关系
    const [existing]: any = await pool.query(
      `SELECT id FROM relationships 
       WHERE user_id = ? AND partner_id = ? AND relationship_type = 'invite'
       LIMIT 1`,
      [inviterId, visitorId]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: true, message: '关系已存在' });
    }

    const relationId = crypto.randomUUID();
    const now = new Date();

    // 建立邀请关系（inviter是上线，visitor是下线）
    await pool.query(
      `INSERT INTO relationships (id, user_id, partner_id, relationship_type, title, status, notes, partner_name, created_at, updated_at)
       VALUES (?, ?, ?, 'invite', ?, 'active', ?, ?, ?, ?)`,
      [relationId, inviterId, visitorId, `分享邀请 - ${shareCode || ''}`, `share_code:${shareCode || ''}`, '', now, now]
    );

    return NextResponse.json({ success: true, message: '溯源关系建立成功' });
  } catch (error) {
    console.error('建立溯源关系错误:', error);
    return NextResponse.json({ success: false, error: '建立关系失败' }, { status: 500 });
  }
}
