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
      'SELECT id, display_name, real_name, avatar_url FROM users WHERE id = ?',
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

// 获取分享统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mode = searchParams.get('mode') || '';

    // 模式1：全站推广业绩排名
    if (mode === 'ranking') {
      const [ranking] = await pool.query(
        `SELECT u.id as user_id, COALESCE(u.real_name, u.display_name, '微信用户') as display_name,
                u.avatar_url,
                COUNT(DISTINCT r.partner_id) as promoted_count
         FROM relationships r
         JOIN users u ON r.user_id = u.id
         WHERE r.relationship_type = 'invite'
         GROUP BY r.user_id
         ORDER BY promoted_count DESC
         LIMIT 20`
      ) as any[];
      return NextResponse.json({
        success: true,
        ranking: (ranking || []).map((r: any, i: number) => ({
          rank: i + 1,
          userId: r.user_id,
          displayName: r.display_name,
          avatarUrl: r.avatar_url || '',
          promotedCount: r.promoted_count,
        })),
      });
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 模式2：被推广用户详情列表
    if (mode === 'promoted') {
      const [promoted] = await pool.query(
        `SELECT r.partner_id, COALESCE(u.real_name, u.display_name, '微信用户') as display_name,
                u.avatar_url, r.created_at as promoted_at, r.notes
         FROM relationships r
         LEFT JOIN users u ON r.partner_id = u.id
         WHERE r.user_id = ? AND r.relationship_type = 'invite'
         ORDER BY r.created_at DESC`,
        [userId]
      ) as any[];
      return NextResponse.json({
        success: true,
        promotedUsers: (promoted || []).map((p: any) => ({
          userId: p.partner_id,
          displayName: p.display_name,
          avatarUrl: p.avatar_url || '',
          promotedAt: p.promoted_at,
          notes: p.notes || '',
        })),
        totalPromoted: (promoted || []).length,
      });
    }

    // 默认模式：用户分享列表 + 摘要
    const [shares] = await pool.query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM share_clicks WHERE share_code = s.share_code) as click_count,
        (SELECT COUNT(DISTINCT r.partner_id) FROM relationships r 
         WHERE r.user_id = s.user_id AND r.relationship_type = 'invite'
         AND r.notes LIKE CONCAT('share_code:', s.share_code, '%')) as promoted_count
       FROM share_links s
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [userId]
    ) as any[];

    // 计算汇总
    const totalShares = (shares || []).length;
    let totalClicks = 0;
    let totalPromotedViaShare = 0;
    (shares || []).forEach((s: any) => {
      totalClicks += (s.click_count || 0);
      totalPromotedViaShare += (s.promoted_count || 0);
    });

    // 总推广人数（distinct）
    const [promotedTotal] = await pool.query(
      `SELECT COUNT(DISTINCT partner_id) as cnt FROM relationships 
       WHERE user_id = ? AND relationship_type = 'invite'`,
      [userId]
    ) as any[];

    return NextResponse.json({
      success: true,
      summary: {
        totalShares,
        totalClicks,
        totalPromoted: promotedTotal?.[0]?.cnt || 0,
      },
      shares: (shares || []).map((s: any) => ({
        id: s.id,
        shareCode: s.share_code,
        targetType: s.target_type,
        targetId: s.target_id,
        title: s.title,
        description: s.description,
        imageUrl: s.image_url,
        clickCount: s.click_count || 0,
        promotedCount: s.promoted_count || 0,
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
