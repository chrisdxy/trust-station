import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT: 处理好友申请（同意/拒绝）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userId } = body; // action: 'accept' | 'reject'

    if (!id || !action || !userId) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    // 验证该申请是发给当前用户的
    const [rows]: any = await pool.query(
      'SELECT * FROM friendships WHERE id = ? AND friend_id = ? AND status = ?',
      [id, userId, 'pending']
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: '申请不存在或已处理' }, { status: 404 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await pool.query(
      'UPDATE friendships SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );

    return NextResponse.json({
      success: true,
      message: action === 'accept' ? '已添加好友' : '已拒绝申请',
    });
  } catch (error: any) {
    console.error('处理好友申请失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
