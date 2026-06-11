import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_members (
      id VARCHAR(50) PRIMARY KEY,
      community_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      user_name VARCHAR(100) DEFAULT '',
      reason TEXT DEFAULT NULL,
      role ENUM('creator', 'admin', 'member') DEFAULT 'member',
      status ENUM('approved', 'pending', 'rejected') DEFAULT 'approved',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_community (community_id),
      INDEX idx_user (user_id),
      INDEX idx_status (status),
      UNIQUE KEY uk_community_user (community_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // 兼容旧表：添加 reason 列（如果不存在）
  try { await pool.query('ALTER TABLE community_members ADD COLUMN reason TEXT DEFAULT NULL AFTER user_name'); } catch {}
  try { await pool.query('ALTER TABLE community_members ADD COLUMN status ENUM("approved","pending","rejected") DEFAULT "approved" AFTER role'); } catch {}
}

// GET: 获取社区成员列表，或获取待审批申请
export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const communityId = request.nextUrl.searchParams.get('communityId');
    const userId = request.nextUrl.searchParams.get('userId');
    const pendingOnly = request.nextUrl.searchParams.get('pending') === 'true';

    if (pendingOnly) {
      if (communityId) {
        // 获取某个社区的待审批申请（管理员用）
        const [rows]: any = await pool.query(
          `SELECT cm.*, u.display_name, u.real_name, u.phone
           FROM community_members cm
           LEFT JOIN users u ON cm.user_id = u.id
           WHERE cm.community_id = ? AND cm.status = 'pending'
           ORDER BY cm.created_at ASC`,
          [communityId]
        );
        return NextResponse.json({ success: true, requests: rows });
      }
      if (userId) {
        // 获取某个用户的待审批申请
        const [rows]: any = await pool.query(
          `SELECT cm.*, u.display_name, u.real_name, u.phone
           FROM community_members cm
           LEFT JOIN users u ON cm.user_id = u.id
           WHERE cm.user_id = ? AND cm.status = 'pending'
           ORDER BY cm.created_at ASC`,
          [userId]
        );
        return NextResponse.json({ success: true, requests: rows });
      }
    }

    if (communityId) {
      const [rows]: any = await pool.query(
        `SELECT cm.*, u.display_name, u.real_name, u.phone
         FROM community_members cm
         LEFT JOIN users u ON cm.user_id = u.id
         WHERE cm.community_id = ? AND cm.status = 'approved'
         ORDER BY cm.role ASC, cm.created_at ASC`,
        [communityId]
      );
      return NextResponse.json({ success: true, members: rows });
    }

    return NextResponse.json({ success: false, error: '缺少社区ID' }, { status: 400 });
  } catch (error) {
    console.error('获取成员失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// POST: 加入/退出/申请加入社区
export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const { communityId, userId, userName, reason, action } = await request.json();

    if (!communityId || !userId) {
      return NextResponse.json(
        { success: false, error: '请提供社区ID和用户ID' },
        { status: 400 }
      );
    }

    if (action === 'join') {
      // 检查社区是否存在
      const [communities] = await pool.query(
        'SELECT * FROM communities WHERE id = ?',
        [communityId]
      ) as any[];

      if (!communities || communities.length === 0) {
        return NextResponse.json(
          { success: false, error: '社区不存在' },
          { status: 404 }
        );
      }

      // 检查是否已有记录（任何状态）
      const [existing] = await pool.query(
        'SELECT id, status FROM community_members WHERE community_id = ? AND user_id = ?',
        [communityId, userId]
      ) as any[];

      if (existing && existing.length > 0) {
        const record = existing[0];
        if (record.status === 'pending') {
          return NextResponse.json(
            { success: false, error: '您的加入申请正在等待审批' },
            { status: 400 }
          );
        }
        if (record.status === 'approved') {
          return NextResponse.json(
            { success: false, error: '您已加入此社区' },
            { status: 400 }
          );
        }
        if (record.status === 'rejected') {
          // 被拒绝后可以重新申请
          await pool.query(
            'UPDATE community_members SET status = ? WHERE id = ?',
            ['pending', record.id]
          );
          return NextResponse.json({
            success: true,
            message: '已重新提交加入申请，请等待管理员审批'
          });
        }
      }

      // 检查是否满员
      const community = communities[0];
      if (community.max_members && community.member_count >= community.max_members) {
        return NextResponse.json(
          { success: false, error: '社区已满员' },
          { status: 400 }
        );
      }

      // 创建待审批的成员记录
      const id = 'cm-' + Date.now();
      await pool.query(
        `INSERT INTO community_members (id, community_id, user_id, user_name, reason, role, status) VALUES (?, ?, ?, ?, ?, 'member', 'pending')`,
        [id, communityId, userId, userName || '', reason || '']
      );

      // 推送给创建者通知
      try {
        const ownerId = community.owner_id;
        if (ownerId) {
          const notifId = 'notif-' + Date.now();
          await pool.query(
            `INSERT INTO notifications (id, user_id, type, title, content, reference_id, reference_name, actor_id, actor_name) VALUES (?, ?, 'community_join', ?, ?, ?, ?, ?, ?)`,
            [notifId, ownerId, '新的共同体加入申请', `${userName || '用户'}申请加入「${community.name}」`, communityId, community.name, userId, userName || '用户']
          );
        }
      } catch {}

      return NextResponse.json({
        success: true,
        message: '加入申请已提交，请等待管理员审批',
        id,
        status: 'pending'
      });
      
    } else if (action === 'leave') {
      // 退出社区
      
      // 检查是否是创建者
      const [communities] = await pool.query(
        'SELECT owner_id FROM communities WHERE id = ?',
        [communityId]
      ) as any[];

      if (communities && communities[0]?.owner_id === userId) {
        return NextResponse.json(
          { success: false, error: '创建者不能退出社区' },
          { status: 400 }
        );
      }

      // 删除成员记录
      await pool.query(
        'DELETE FROM community_members WHERE community_id = ? AND user_id = ?',
        [communityId, userId]
      );

      // 减少成员数
      await pool.query(
        'UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = ?',
        [communityId]
      );

      return NextResponse.json({
        success: true,
        message: '已退出社区'
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('社区操作错误:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}

// PUT: 审批成员申请
export async function PUT(request: NextRequest) {
  try {
    await ensureTable();
    const { requestId, communityId, userId, action } = await request.json();
    // action: 'approve' | 'reject'

    if (!requestId && (!communityId || !userId)) {
      return NextResponse.json(
        { success: false, error: '请提供申请ID或社区ID和用户ID' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // 查找待审批的记录
      let record;
      if (requestId) {
        const [rows]: any = await pool.query(
          'SELECT * FROM community_members WHERE id = ? AND status = ?',
          [requestId, 'pending']
        );
        record = rows?.[0];
      } else {
        const [rows]: any = await pool.query(
          'SELECT * FROM community_members WHERE community_id = ? AND user_id = ? AND status = ?',
          [communityId, userId, 'pending']
        );
        record = rows?.[0];
      }

      if (!record) {
        return NextResponse.json(
          { success: false, error: '未找到待审批的申请' },
          { status: 404 }
        );
      }

      // 更新状态为 approved
      await pool.query(
        'UPDATE community_members SET status = ? WHERE id = ?',
        ['approved', record.id]
      );

      // 更新社区成员数和 member_list
      const userName = record.user_name || userId;
      await pool.query(
        'UPDATE communities SET member_count = member_count + 1, member_list = JSON_ARRAY_APPEND(COALESCE(member_list, "[]"), "$", CAST(? AS JSON)) WHERE id = ?',
        [JSON.stringify({ name: userName, email: 'uid-' + userId, role: 'member', joinedAt: new Date().toISOString().split('T')[0] }), record.community_id]
      );

      return NextResponse.json({ success: true, message: '已通过申请' });
      
    } else if (action === 'reject') {
      let record;
      if (requestId) {
        const [rows]: any = await pool.query(
          'SELECT * FROM community_members WHERE id = ? AND status = ?',
          [requestId, 'pending']
        );
        record = rows?.[0];
      } else {
        const [rows]: any = await pool.query(
          'SELECT * FROM community_members WHERE community_id = ? AND user_id = ? AND status = ?',
          [communityId, userId, 'pending']
        );
        record = rows?.[0];
      }

      if (!record) {
        return NextResponse.json(
          { success: false, error: '未找到待审批的申请' },
          { status: 404 }
        );
      }

      await pool.query(
        'UPDATE community_members SET status = ? WHERE id = ?',
        ['rejected', record.id]
      );

      return NextResponse.json({ success: true, message: '已拒绝申请' });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('审批操作错误:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
