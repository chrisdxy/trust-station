import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL COMMENT '接收通知的用户ID',
      type VARCHAR(50) NOT NULL COMMENT '通知类型: community_join/community_approved/system',
      title VARCHAR(200) DEFAULT NULL COMMENT '通知标题',
      content TEXT DEFAULT NULL COMMENT '通知内容',
      reference_id VARCHAR(50) DEFAULT NULL COMMENT '关联ID（如共同体ID）',
      reference_name VARCHAR(200) DEFAULT NULL COMMENT '关联名称（如共同体名称）',
      actor_id VARCHAR(100) DEFAULT NULL COMMENT '触发者用户ID',
      actor_name VARCHAR(100) DEFAULT NULL COMMENT '触发者用户名',
      is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET: 获取用户通知列表
export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const userId = request.nextUrl.searchParams.get('userId');
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true';

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (unreadOnly) {
      query += ' AND is_read = 0';
    }
    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows]: any = await pool.query(query, params);
    return NextResponse.json({ success: true, notifications: rows });
  } catch (error: any) {
    console.error('获取通知失败:', error?.message);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// PUT: 标记通知为已读
export async function PUT(request: NextRequest) {
  try {
    await ensureTable();
    const { userId, notificationId } = await request.json();

    if (notificationId) {
      await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [notificationId]);
    } else if (userId) {
      await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    } else {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('标记已读失败:', error?.message);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}
