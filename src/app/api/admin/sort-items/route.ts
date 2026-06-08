import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取列表（用于排序管理）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'community';

    if (!['community', 'activity', 'project'].includes(type)) {
      return NextResponse.json({ success: false, error: '无效的类型' }, { status: 400 });
    }

    let sql = '';
    if (type === 'community') {
      sql = 'SELECT id, name, sort_order, is_pinned, member_count, created_at FROM communities WHERE status = ? ORDER BY is_pinned DESC, sort_order ASC, member_count DESC, created_at DESC';
    } else if (type === 'activity') {
      sql = 'SELECT id, title as name, sort_order, is_pinned, start_time as created_at FROM activities WHERE status = ? ORDER BY is_pinned DESC, sort_order ASC, start_time DESC';
    } else if (type === 'project') {
      sql = 'SELECT id, name, sort_order, is_pinned, created_at FROM projects WHERE status = ? ORDER BY is_pinned DESC, sort_order ASC, created_at DESC';
    }

    const [rows] = await pool.query(sql, ['active']);
    return NextResponse.json({ success: true, items: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 更新排序
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, items } = body;

    if (!['community', 'activity', 'project'].includes(type)) {
      return NextResponse.json({ success: false, error: '无效的类型' }, { status: 400 });
    }
    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'items 必须是数组' }, { status: 400 });
    }

    let table = '';
    if (type === 'community') table = 'communities';
    else if (type === 'activity') table = 'activities';
    else if (type === 'project') table = 'projects';

    for (const item of items) {
      await pool.query(
        `UPDATE ${table} SET sort_order = ?, is_pinned = ? WHERE id = ?`,
        [item.sort_order || 0, item.is_pinned ? 1 : 0, item.id]
      );
    }

    return NextResponse.json({ success: true, message: '排序更新成功' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
