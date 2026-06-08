import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 公开API：获取分类列表（无需管理员权限）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    
    if (!type) {
      return NextResponse.json(
        { success: false, error: '缺少type参数' },
        { status: 400 }
      );
    }

    let sql = 'SELECT * FROM categories WHERE type = ?';
    const params: any[] = [type];

    sql += ' ORDER BY sort_order ASC, created_at ASC';

    const [rows]: any = await pool.query(sql, params);

    return NextResponse.json({
      success: true,
      categories: rows || []
    });
  } catch (error: any) {
    console.error('获取分类列表错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取分类列表失败' },
      { status: 500 }
    );
  }
}

// 添加分类
export async function POST(request: NextRequest) {
  try {
    const { type, name, description, sort_order } = await request.json();
    if (!type || !name) {
      return NextResponse.json({ success: false, error: 'type 和 name 为必填' }, { status: 400 });
    }
    await pool.query(
      'INSERT INTO categories (type, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [type, name, description || null, sort_order || 0]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('添加分类失败:', error.message);
    return NextResponse.json({ success: false, error: '添加失败' }, { status: 500 });
  }
}

// 更新分类
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description, sort_order, status } = await request.json();
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    const updates: string[] = [];
    const values: any[] = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (updates.length === 0) return NextResponse.json({ success: false, error: '无变更' }, { status: 400 });
    values.push(id);
    await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新分类失败:', error.message);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

// 删除分类
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: '缺少 id' }, { status: 400 });
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除分类失败:', error.message);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
