import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 记录分享点击
export async function POST(request: NextRequest) {
  try {
    const { shareCode, visitorId, ipAddress, userAgent, referer } = await request.json();

    if (!shareCode) {
      return NextResponse.json(
        { success: false, error: '缺少分享码' },
        { status: 400 }
      );
    }

    // 获取分享链接信息（包含分享者信息）
    const [shareRows] = await pool.query(
      `SELECT sl.*, u.display_name as sharer_name, u.real_name as sharer_real_name, 
              u.avatar_url as sharer_avatar, u.invite_code
       FROM share_links sl
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.share_code = ? LIMIT 1`,
      [shareCode]
    ) as any[];

    const share = shareRows?.[0];

    if (!share) {
      return NextResponse.json(
        { success: false, error: '分享链接不存在' },
        { status: 404 }
      );
    }

    // 记录点击
    await pool.query(
      `INSERT INTO share_clicks (share_code, visitor_id, ip_address, user_agent, referer)
       VALUES (?, ?, ?, ?, ?)`,
      [shareCode, visitorId || null, ipAddress || null, userAgent || null, referer || null]
    );

    return NextResponse.json({
      success: true,
      sharer: share.user_id ? {
        id: share.user_id,
        name: share.sharer_real_name || share.sharer_name || '正道用户',
        avatar: share.sharer_avatar,
        inviteCode: share.invite_code,
      } : null,
      shareInfo: {
        shareCode: share.share_code,
        targetType: share.target_type,
        targetId: share.target_id,
        title: share.title,
        description: share.description,
        imageUrl: share.image_url,
      },
    });
  } catch (error) {
    console.error('记录分享点击错误:', error);
    return NextResponse.json(
      { success: false, error: '记录失败' },
      { status: 500 }
    );
  }
}

// 获取分享信息（供落地页使用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少分享码' },
        { status: 400 }
      );
    }

    const [rows] = await pool.query(
      `SELECT * FROM share_links WHERE share_code = ? LIMIT 1`,
      [code]
    ) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '分享链接不存在' },
        { status: 404 }
      );
    }

    const share = rows[0];
    return NextResponse.json({
      success: true,
      share: {
        shareCode: share.share_code,
        targetType: share.target_type,
        targetId: share.target_id,
        title: share.title,
        description: share.description,
        imageUrl: share.image_url,
      },
    });
  } catch (error) {
    console.error('获取分享信息错误:', error);
    return NextResponse.json(
      { success: false, error: '获取分享信息失败' },
      { status: 500 }
    );
  }
}
