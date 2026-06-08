import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取分类列表（按 type）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    if (!type) {
      return NextResponse.json({ success: false, error: '缺少 type 参数' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC',
      [type]
    );

    return NextResponse.json({ success: true, categories: result });
  } catch (error: any) {
    console.error('获取分类失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 创建分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, sort_order, parent_id, description, status } = body;

    if (!type || !name) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      'INSERT INTO categories (type, name, sort_order, parent_id, description, status) VALUES (?, ?, ?, ?, ?, ?)',
      [type, name, sort_order || 0, parent_id || null, description || null, status || 'active']
    );

    return NextResponse.json({ success: true, id: result.insertId, message: '创建成功' });
  } catch (error: any) {
    console.error('创建分类失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 更新分类
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sort_order, description, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少分类ID' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
    }

    params.push(id);
    await pool.query(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('更新分类失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 删除分类（支持单个或批量）
export async function DELETE(request: NextRequest) {
  try {
    let ids: string[] = [];
    
    // 优先从 body 读取（批量删除）
    try {
      const body = await request.json();
      if (body.ids && Array.isArray(body.ids)) {
        ids = body.ids.map(String);
      }
    } catch {
      // body 不可解析，从 query 读取
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (id) ids = [id];
    }

    // 如果 body 和 query 都没有，尝试 query
    if (ids.length === 0) {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (id) ids = [id];
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: '缺少分类ID' }, { status: 400 });
    }

    const placeholders = ids.map(() => '?').join(',');
    await pool.query(`DELETE FROM categories WHERE parent_id IN (${placeholders})`, ids);
    await pool.query(`DELETE FROM categories WHERE id IN (${placeholders})`, ids);

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除分类失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
