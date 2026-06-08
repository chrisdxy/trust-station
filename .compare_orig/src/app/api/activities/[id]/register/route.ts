import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 报名活动
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;

    console.log('[活动报名]', { userId, activityId });

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 检查活动是否存在且状态正常
    const [activityRows]: any = await pool.query(
      'SELECT id, status, max_participants, current_participants FROM activities WHERE id = ?',
      [activityId]
    );
    if (!activityRows?.[0]) {
      return NextResponse.json({ success: false, error: '活动不存在' }, { status: 404 });
    }
    const activity = activityRows[0];
    if (activity.status !== 'upcoming') {
      return NextResponse.json({ success: false, error: '该活动无法报名' }, { status: 400 });
    }
    if (activity.max_participants && activity.current_participants >= activity.max_participants) {
      return NextResponse.json({ success: false, error: '活动名额已满' }, { status: 400 });
    }

    // 检查是否已报名
    const [existing]: any = await pool.query(
      'SELECT id, status FROM activity_participants WHERE activity_id = ? AND user_id = ?',
      [activityId, userId]
    );
    if (existing?.[0]) {
      if (existing[0].status === 'registered') {
        return NextResponse.json({ success: false, error: '您已报名该活动' }, { status: 400 });
      }
      // 之前取消过，重新报名
      await pool.query(
        'UPDATE activity_participants SET status = "registered" WHERE id = ?',
        [existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, "registered")',
        [activityId, userId]
      );
    }

    // 更新 current_participants
    await pool.query(
      'UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?',
      [activityId]
    );

    console.log('[活动报名] 成功', { userId, activityId });
    return NextResponse.json({ success: true, message: '报名成功' });
  } catch (error: any) {
    console.error('[活动报名] 错误:', error?.message || error);
    return NextResponse.json(
      { success: false, error: '报名失败: ' + (error?.message || '未知错误') },
      { status: 500 }
    );
  }
}
