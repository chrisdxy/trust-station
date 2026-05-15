import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 批量操作分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, items, names, parent_id } = body;

    // 兼容两种格式：前端用 items，API 用 names
    const categoryNames = items 
      ? items.map((item: any) => item.name).filter(Boolean)
      : (names || []).filter((n: string) => n.trim());

    if (categoryNames.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供分类名称列表' },
        { status: 400 }
      );
    }

    const insertedIds: number[] = [];

    for (let i = 0; i < categoryNames.length; i++) {
      const name = categoryNames[i].trim();
      if (!name) continue;

      // 从 items 中获取 sortOrder，如果没有则使用索引
      const sortOrder = items 
        ? (items[i]?.sortOrder || items[i]?.sort_order || i)
        : i;
      
      const [result]: any = await pool.query(
        `INSERT INTO categories (name, type, sort_order, parent_id) VALUES (?, ?, ?, ?)`,
        [name, type || 'community', sortOrder, parent_id || null]
      );
      insertedIds.push(result.insertId);
    }

    return NextResponse.json({
      success: true,
      message: `成功添加 ${insertedIds.length} 个分类`,
      ids: insertedIds,
    });
  } catch (error: any) {
    console.error('批量添加分类错误:', error.message);
    return NextResponse.json(
      { success: false, error: '批量添加分类失败' },
      { status: 500 }
    );
  }
}

// 批量更新分类序号
export async function PUT(request: NextRequest) {
  try {
    const { updates } = await request.json();

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: '请提供更新数据' },
        { status: 400 }
      );
    }

    for (const item of updates) {
      if (item.id && item.sort_order !== undefined) {
        await pool.query(
          'UPDATE categories SET sort_order = ?, updated_at = NOW() WHERE id = ?',
          [item.sort_order, item.id]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '批量更新成功',
    });
  } catch (error: any) {
    console.error('批量更新分类错误:', error.message);
    return NextResponse.json(
      { success: false, error: '批量更新失败' },
      { status: 500 }
    );
  }
}

// 批量删除分类
export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供要删除的分类ID' },
        { status: 400 }
      );
    }

    const placeholders = ids.map(() => '?').join(',');
    await pool.query(
      `DELETE FROM categories WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({
      success: true,
      message: '批量删除成功',
    });
  } catch (error: any) {
    console.error('批量删除分类错误:', error.message);
    return NextResponse.json(
      { success: false, error: '批量删除失败' },
      { status: 500 }
    );
  }
}
