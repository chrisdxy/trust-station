import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取投诉建议列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const parentId = searchParams.get('parentId') || ''; // 获取某个反馈的跟进

    const where: string[] = ['parent_id IS NULL']; // 默认只查根反馈
    const params: any[] = [];

    if (parentId) {
      // 查特定跟进链：根 + 所有子
      where.length = 0;
      where.push('(id = ? OR parent_id = ?)');
      params.push(parentId, parentId);
    }
    if (userId) { where.push('user_id = ?'); params.push(userId); }
    if (type) { where.push('type = ?'); params.push(type); }
    if (status) { where.push('status = ?'); params.push(status); }

    const offset = (page - 1) * limit;
    const [countRows]: any = await pool.query(`SELECT COUNT(*) as total FROM feedbacks WHERE ${where.join(' AND ')}`, params);
    const total = countRows[0]?.total || 0;

    const [rows]: any = await pool.query(
      `SELECT * FROM feedbacks WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 后台未读统计（管理端）
    const [pendingCounts]: any = await pool.query(
      "SELECT type, COUNT(*) as cnt FROM feedbacks WHERE status = 'pending' GROUP BY type"
    );
    const unreadCounts: Record<string, number> = {};
    pendingCounts.forEach((r: any) => { unreadCounts[r.type] = r.cnt; });

    // 前台用户未读统计（有回复但用户没读）
    let userUnreadCount = 0;
    if (userId) {
      const [uRows]: any = await pool.query(
        "SELECT COUNT(*) as cnt FROM feedbacks WHERE user_id = ? AND admin_reply IS NOT NULL AND user_read = 0 AND parent_id IS NULL",
        [userId]
      );
      userUnreadCount = uRows[0]?.cnt || 0;
    }

    return NextResponse.json({
      success: true,
      items: rows || [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      unreadCounts,
      userUnreadCount
    });
  } catch (error: any) {
    console.error('获取投诉建议失败:', error.message);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 提交投诉/建议/跟进
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, type, content, parentId } = body;

    if (!userId || !content) {
      return NextResponse.json({ success: false, error: '请填写完整信息' }, { status: 400 });
    }

    const id = uuidv4();

    if (parentId) {
      // 跟进回复（用户补充或管理员回复）
      const [parent]: any = await pool.query('SELECT type FROM feedbacks WHERE id = ?', [parentId]);
      if (parent.length === 0) {
        return NextResponse.json({ success: false, error: '原反馈不存在' }, { status: 400 });
      }
      const feedbackType = parent[0].type;
      await pool.query(
        'INSERT INTO feedbacks (id, parent_id, user_id, user_name, type, content) VALUES (?, ?, ?, ?, ?, ?)',
        [id, parentId, userId, userName || '', feedbackType, content]
      );
      // 父反馈状态改回 pending，user_read 重置
      await pool.query("UPDATE feedbacks SET status = 'pending', user_read = 0 WHERE id = ?", [parentId]);
    } else {
      // 新投诉/建议
      if (!type || !['complaint', 'suggestion'].includes(type)) {
        return NextResponse.json({ success: false, error: '类型错误' }, { status: 400 });
      }
      await pool.query(
        'INSERT INTO feedbacks (id, user_id, user_name, type, content) VALUES (?, ?, ?, ?, ?)',
        [id, userId, userName || '', type, content]
      );
    }

    return NextResponse.json({ success: true, message: '提交成功', id });
  } catch (error: any) {
    console.error('提交失败:', error.message);
    return NextResponse.json({ success: false, error: '提交失败' }, { status: 500 });
  }
}

// 更新状态/回复/标记已读
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, adminReply, userRead, userId } = body;

    if (!id && !userRead) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }

    // 标记用户已读
    if (userRead && userId) {
      await pool.query(
        "UPDATE feedbacks SET user_read = 1 WHERE user_id = ? AND parent_id IS NULL",
        [userId]
      );
      return NextResponse.json({ success: true, message: '已标记已读' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status) { updates.push('status = ?'); params.push(status); }
    if (adminReply !== undefined) { updates.push('admin_reply = ?'); params.push(adminReply); }
    if (adminReply !== undefined) { updates.push('user_read = 0'); } // 管理员回复后重置用户未读标记

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '无更新内容' }, { status: 400 });
    }

    params.push(id);
    await pool.query(`UPDATE feedbacks SET ${updates.join(', ')} WHERE id = ?`, params);

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('更新失败:', error.message);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}
