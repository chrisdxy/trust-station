import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 确保表存在
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL COMMENT '申请人',
      friend_id VARCHAR(36) NOT NULL COMMENT '被申请人',
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending' COMMENT '状态',
      message VARCHAR(200) DEFAULT NULL COMMENT '申请留言',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_friend_id (friend_id),
      UNIQUE KEY uk_friendship (user_id, friend_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET: 获取好友申请列表
// ?type=received - 收到的申请（别人加我）
// ?type=sent - 发出的申请（我加别人）
// ?type=friends - 已是好友
export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || 'received';

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少userId' }, { status: 400 });
    }

    let sql: string;
    let params: any[];

    if (type === 'received') {
      // 收到的好友申请
      sql = `
        SELECT f.id, f.user_id, f.friend_id, f.status, f.message, f.created_at,
               u.display_name, u.real_name, u.avatar_url, u.user_type, u.company_name,
               p.bio, p.expertise, u.identity_verified
        FROM friendships f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN profiles p ON f.user_id = p.user_id
        WHERE f.friend_id = ? AND f.status = 'pending'
        ORDER BY f.created_at DESC
      `;
      params = [userId];
    } else if (type === 'sent') {
      // 发出的好友申请
      sql = `
        SELECT f.id, f.user_id, f.friend_id, f.status, f.message, f.created_at,
               u.display_name, u.real_name, u.avatar_url, u.user_type, u.company_name,
               p.bio, p.expertise, u.identity_verified
        FROM friendships f
        JOIN users u ON f.friend_id = u.id
        LEFT JOIN profiles p ON f.friend_id = p.user_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
      `;
      params = [userId];
    } else {
      // 已是好友
      sql = `
        SELECT f.id, f.user_id, f.friend_id, f.created_at,
               u.display_name, u.real_name, u.phone, u.avatar_url, u.user_type, u.company_name,
               p.bio, p.expertise, u.identity_verified
        FROM friendships f
        JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
        ORDER BY f.created_at DESC
      `;
      params = [userId, userId, userId];
    }

    const [rows]: any = await pool.query(sql, params);
    return NextResponse.json({ success: true, requests: rows });
  } catch (error: any) {
    console.error('获取好友申请失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 发起好友申请
export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const body = await request.json();
    const { userId, friendId, message } = body;

    if (!userId || !friendId) {
      return NextResponse.json({ success: false, error: '缺少userId或friendId' }, { status: 400 });
    }

    if (userId === friendId) {
      return NextResponse.json({ success: false, error: '不能加自己为好友' }, { status: 400 });
    }

    // 检查是否已有记录
    const [existing]: any = await pool.query(
      'SELECT id, status FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, friendId, friendId, userId]
    );

    if (existing.length > 0) {
      const record = existing[0];
      if (record.status === 'pending') {
        return NextResponse.json({ success: false, error: '已发送过申请，请等待对方处理' }, { status: 400 });
      }
      if (record.status === 'accepted') {
        return NextResponse.json({ success: false, error: '你们已经是好友了' }, { status: 400 });
      }
      // rejected → 更新为 pending 重新申请
      await pool.query(
        'UPDATE friendships SET user_id = ?, friend_id = ?, status = ?, message = ?, updated_at = NOW() WHERE id = ?',
        [userId, friendId, 'pending', message || null, record.id]
      );
      return NextResponse.json({ success: true, message: '已重新发送好友申请' });
    }

    const [result]: any = await pool.query(
      'INSERT INTO friendships (id, user_id, friend_id, status, message) VALUES (UUID(), ?, ?, ?, ?)',
      [userId, friendId, 'pending', message || null]
    );

    return NextResponse.json({ success: true, message: '好友申请已发送' });
  } catch (error: any) {
    console.error('发送好友申请失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
