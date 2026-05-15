import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取分类列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    let sql = 'SELECT * FROM categories';
    const params: any[] = [];

    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY sort_order ASC, created_at ASC';

    const [rows]: any = await pool.query(sql, params);

    return NextResponse.json({
      success: true,
      categories: rows || [],
    });
  } catch (error: any) {
    console.error('获取分类列表错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取分类列表失败' },
      { status: 500 }
    );
  }
}

// 添加/更新分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, description, sort_order, parent_id } = body;
    
    console.log('[API] POST /api/admin/categories:', { id, name, type, sort_order, parent_id });

    // 如果有ID则是更新
    if (id) {
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (sort_order !== undefined) {
        updates.push('sort_order = ?');
        values.push(sort_order);
      }
      if (parent_id !== undefined) {
        updates.push('parent_id = ?');
        values.push(parent_id);
      }

      if (updates.length > 0) {
        values.push(id);
        await pool.query(
          `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
      }

      return NextResponse.json({
        success: true,
        message: '分类更新成功',
      });
    }

    // 否则是新增
    console.log('[API] 插入新分类:', { name, type, sort_order, parent_id });
    const [result]: any = await pool.query(
      `INSERT INTO categories (name, type, description, sort_order, parent_id) VALUES (?, ?, ?, ?, ?)`,
      [name, type, description || null, sort_order || 0, parent_id || null]
    );
    console.log('[API] 插入成功，ID:', result.insertId);

    return NextResponse.json({
      success: true,
      message: '分类添加成功',
      id: result.insertId,
    });
  } catch (error: any) {
    console.error('[API] 添加分类错误:', error.message, error.stack);
    return NextResponse.json(
      { success: false, error: '添加分类失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 删除分类
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      const body = await request.json().catch(() => ({}));
      const ids = body.ids;
      
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
    } else {
      await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    }

    return NextResponse.json({
      success: true,
      message: '分类删除成功',
    });
  } catch (error: any) {
    console.error('删除分类错误:', error.message);
    return NextResponse.json(
      { success: false, error: '删除分类失败' },
      { status: 500 }
    );
  }
}
