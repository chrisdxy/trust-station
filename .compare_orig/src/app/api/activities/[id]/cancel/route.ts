import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 取消报名
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;

    console.log('[取消报名]', { userId, activityId });

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 检查活动是否存在
    const [activityRows]: any = await pool.query(
      'SELECT id, status FROM activities WHERE id = ?',
      [activityId]
    );
    if (!activityRows?.[0]) {
      return NextResponse.json({ success: false, error: '活动不存在' }, { status: 404 });
    }
    if (activityRows[0].status !== 'upcoming') {
      return NextResponse.json({ success: false, error: '该活动无法取消报名' }, { status: 400 });
    }

    // 检查是否已报名
    const [existing]: any = await pool.query(
      'SELECT id, status FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );
    if (!existing?.[0] || existing[0].status !== 'registered') {
      return NextResponse.json({ success: false, error: '您尚未报名该活动' }, { status: 400 });
    }

    // 取消报名
    await pool.query(
      'UPDATE activity_participants SET status = "cancelled" WHERE id = ?',
      [existing[0].id]
    );

    // 减少 current_participants
    await pool.query(
      'UPDATE activities SET current_participants = GREATEST(current_participants - 1, 0) WHERE id = ?',
      [activityId]
    );

    console.log('[取消报名] 成功', { userId, activityId });
    return NextResponse.json({ success: true, message: '已取消报名' });
  } catch (error: any) {
    console.error('[取消报名] 错误:', error?.message || error);
    return NextResponse.json(
      { success: false, error: '取消失败: ' + (error?.message || '未知错误') },
      { status: 500 }
    );
  }
}
