import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import crypto from 'crypto';

// 创建分享链接
export async function POST(request: NextRequest) {
  try {
    const { userId, targetType, targetId, title, description, imageUrl } = await request.json();

    if (!userId || !targetType || !targetId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取分享者信息（头像、昵称）
    const [users] = await pool.query(
      'SELECT id, display_name, real_name, avatar_url, invite_code FROM users WHERE id = ?',
      [userId]
    ) as any[];
    const sharer = users?.[0];

    // 检查是否已存在相同分享（同一用户、同一目标）
    const [existing] = await pool.query(
      'SELECT share_code FROM share_links WHERE user_id = ? AND target_type = ? AND target_id = ? LIMIT 1',
      [userId, targetType, targetId]
    ) as any[];

    if (existing && existing.length > 0) {
      const code = existing[0].share_code;
      const shareUrl = `${getBaseUrl(request)}/share/${code}?inviter=${userId}`;
      return NextResponse.json({
        success: true,
        shareCode: code,
        shareUrl,
        sharer: sharer ? {
          id: sharer.id,
          name: sharer.real_name || sharer.display_name || '正道用户',
          avatar: sharer.avatar_url,
          inviteCode: sharer.invite_code,
        } : null,
      });
    }

    // 生成唯一分享码
    const shareCode = crypto.randomBytes(12).toString('hex');

    await pool.query(
      `INSERT INTO share_links (user_id, target_type, target_id, share_code, title, description, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, targetType, targetId, shareCode, title || '', description || '', imageUrl || '']
    );

    const shareUrl = `${getBaseUrl(request)}/share/${shareCode}?inviter=${userId}`;

    return NextResponse.json({
      success: true,
      shareCode: shareCode,
      shareUrl,
      sharer: sharer ? {
        id: sharer.id,
        name: sharer.real_name || sharer.display_name || '正道用户',
        avatar: sharer.avatar_url,
        inviteCode: sharer.invite_code,
      } : null,
    });
  } catch (error) {
    console.error('创建分享链接错误:', error);
    return NextResponse.json(
      { success: false, error: '创建分享链接失败' },
      { status: 500 }
    );
  }
}

// 获取分享统计（当前用户）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 获取用户的分享列表及点击数
    const [shares] = await pool.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM share_clicks WHERE share_code = s.share_code) as click_count
       FROM share_links s
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [userId]
    ) as any[];

    return NextResponse.json({
      success: true,
      shares: (shares || []).map((s: any) => ({
        id: s.id,
        shareCode: s.share_code,
        targetType: s.target_type,
        targetId: s.target_id,
        title: s.title,
        description: s.description,
        imageUrl: s.image_url,
        clickCount: s.click_count || 0,
        createdAt: s.created_at,
      })),
    });
  } catch (error) {
    console.error('获取分享统计错误:', error);
    return NextResponse.json(
      { success: false, error: '获取分享统计失败' },
      { status: 500 }
    );
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'myfriends.vip';
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}
