import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取单个活动详情
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // 获取活动详情
    const [rows]: any = await pool.query(
      `SELECT a.*, u.display_name as organizer_name, ou.display_name as organizer_name_selected,
              (a.organizer_id IS NOT NULL AND a.organizer_id != '' AND a.organizer_id = ?) as is_organizer_member
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN users ou ON a.organizer_id = ou.id
       WHERE a.id = ?`,
      [userId, activityId]
    );
    if (!rows?.[0]) {
      return NextResponse.json({ success: false, error: '活动不存在' }, { status: 404 });
    }
    const activity = rows[0];

    // 如果提供了 userId，查询该用户的报名状态
    let registration = null;
    if (userId) {
      const [regRows]: any = await pool.query(
        'SELECT status, created_at FROM activity_participants WHERE activity_id = ? AND user_id = ?',
        [activityId, userId]
      );
      if (regRows?.[0]) {
        registration = { status: regRows[0].status, registeredAt: regRows[0].created_at };
      }
    }

    return NextResponse.json({ success: true, activity, registration });
  } catch (error: any) {
    console.error('[活动详情] 错误:', error?.message || error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 更新活动
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  try {
    const body = await request.json();
    const userId = body.userId || body.user_id;

    console.log('[编辑活动]', { userId, activityId, body });

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 检查权限：只有活动创建者才能编辑
    const [rows]: any = await pool.query('SELECT user_id FROM activities WHERE id = ?', [activityId]);
    if (!rows?.[0]) {
      return NextResponse.json({ success: false, error: '活动不存在' }, { status: 404 });
    }
    if (String(rows[0].user_id) !== String(userId)) {
      return NextResponse.json({ success: false, error: '无权限编辑此活动' }, { status: 403 });
    }

    const { title, description, location, start_time, end_time, max_participants, status, cover_image, coverImage, is_paid, isPaid, price } = body;
    const coverImageUrl = cover_image || coverImage;
    const isPaidVal = is_paid || isPaid ? 1 : 0;
    const priceVal = price !== undefined ? price : null;
    const startTime = start_time
      ? (() => {
          const d = new Date(start_time);
          return !isNaN(d.getTime()) ? d.toISOString().slice(0, 19).replace('T', ' ') : null;
        })()
      : null;
    const endTime = end_time
      ? (() => {
          const d = new Date(end_time);
          return !isNaN(d.getTime()) ? d.toISOString().slice(0, 19).replace('T', ' ') : null;
        })()
      : null;

    const updates: string[] = [];
    const values: any[] = [];
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (location !== undefined) { updates.push('location = ?'); values.push(location); }
    if (startTime !== undefined) { updates.push('start_time = ?'); values.push(startTime); }
    if (endTime !== undefined) { updates.push('end_time = ?'); values.push(endTime); }
    if (max_participants !== undefined) { updates.push('max_participants = ?'); values.push(max_participants); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (coverImageUrl !== undefined) { updates.push('cover_image = ?'); values.push(coverImageUrl); }
    if (isPaidVal !== undefined) { updates.push('is_paid = ?'); values.push(isPaidVal); }
    if (priceVal !== undefined) { updates.push('price = ?'); values.push(priceVal); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
    }

    values.push(activityId);
    await pool.query(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`, values);
    console.log('[编辑活动] 成功', { activityId });
    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[编辑活动] 错误:', error?.message || error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// 删除活动
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: activityId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('[删除活动]', { userId, activityId });

    if (!userId) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 检查权限
    const [rows]: any = await pool.query('SELECT user_id FROM activities WHERE id = ?', [activityId]);
    if (!rows?.[0]) {
      return NextResponse.json({ success: false, error: '活动不存在' }, { status: 404 });
    }
    if (String(rows[0].user_id) !== String(userId)) {
      return NextResponse.json({ success: false, error: '无权限删除此活动' }, { status: 403 });
    }

    // 删除报名记录
    await pool.query('DELETE FROM activity_participants WHERE activity_id = ?', [activityId]);
    // 删除活动
    await pool.query('DELETE FROM activities WHERE id = ?', [activityId]);

    console.log('[删除活动] 成功', { activityId });
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[删除活动] 错误:', error?.message || error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
