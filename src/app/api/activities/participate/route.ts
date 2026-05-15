import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 活动参与/报名
export async function POST(request: NextRequest) {
  try {
    const { activityId, userId, userName } = await request.json();

    if (!activityId || !userId) {
      return NextResponse.json(
        { success: false, error: '请提供活动ID和用户ID' },
        { status: 400 }
      );
    }

    // 检查活动是否存在
    const [activities] = await pool.query(
      'SELECT * FROM activities WHERE id = ?',
      [activityId]
    ) as any[];

    if (!activities || activities.length === 0) {
      return NextResponse.json(
        { success: false, error: '活动不存在' },
        { status: 404 }
      );
    }

    // 检查是否已报名
    const [existing] = await pool.query(
      'SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ? AND status != "cancelled"',
      [activityId, userId]
    ) as any[];

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '您已报名此活动' },
        { status: 400 }
      );
    }

    // 检查是否满员
    const activity = activities[0];
    if (activity.max_participants && activity.current_participants >= activity.max_participants) {
      return NextResponse.json(
        { success: false, error: '活动已满员' },
        { status: 400 }
      );
    }

    // 创建参与记录
    const id = 'ap-' + Date.now();
    await pool.query(
      `INSERT INTO activity_participants (id, activity_id, user_id, user_name, status) VALUES (?, ?, ?, ?, 'registered')`,
      [id, activityId, userId, userName || '']
    );

    // 更新参与人数
    await pool.query(
      'UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?',
      [activityId]
    );

    return NextResponse.json({
      success: true,
      message: '报名成功',
      id,
    });
  } catch (error) {
    console.error('活动报名错误:', error);
    return NextResponse.json(
      { success: false, error: '报名失败' },
      { status: 500 }
    );
  }
}

// 取消参与
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityId = searchParams.get('activityId');
    const userId = searchParams.get('userId');

    if (!activityId || !userId) {
      return NextResponse.json(
        { success: false, error: '请提供活动ID和用户ID' },
        { status: 400 }
      );
    }

    // 更新状态为取消
    await pool.query(
      `UPDATE activity_participants SET status = 'cancelled' WHERE activity_id = ? AND user_id = ?`,
      [activityId, userId]
    );

    // 减少参与人数
    await pool.query(
      'UPDATE activities SET current_participants = GREATEST(0, current_participants - 1) WHERE id = ?',
      [activityId]
    );

    return NextResponse.json({
      success: true,
      message: '已取消报名',
    });
  } catch (error) {
    console.error('取消参与错误:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
