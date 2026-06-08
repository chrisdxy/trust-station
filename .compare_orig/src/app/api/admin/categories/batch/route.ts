import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 批量创建分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, items } = body;

    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    let count = 0;
    for (const item of items) {
      await pool.query(
        'INSERT INTO categories (type, name, sort_order, status) VALUES (?, ?, ?, ?)',
        [type, item.name, item.sortOrder || 0, 'active']
      );
      count++;
    }

    return NextResponse.json({ success: true, message: `成功添加 ${count} 个分类` });
  } catch (error: any) {
    console.error('批量创建分类失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 批量更新分类（如排序）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, sortOrder } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: '缺少分类ID列表' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE categories SET sort_order = ? WHERE id IN (${placeholders})`,
      [sortOrder || 0, ...ids]
    );

    return NextResponse.json({ success: true, message: '排序更新成功' });
  } catch (error: any) {
    console.error('批量更新分类失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
