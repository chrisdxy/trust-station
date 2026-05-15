import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取单条记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [result]: any = await pool.query(
      `SELECT * FROM records WHERE id = ?`,
      [id]
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    const row = result[0];
    return NextResponse.json({
      success: true,
      record: {
        ...row,
        tags: row.tags || '',
        related_items: row.related_items ? JSON.parse(row.related_items) : [],
        related_parties: row.related_parties ? JSON.parse(row.related_parties) : [],
      },
    });
  } catch (error) {
    console.error('获取记录详情错误:', error);
    return NextResponse.json(
      { success: false, error: '获取记录详情失败' },
      { status: 500 }
    );
  }
}

// 更新记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, content, recordType, tags, visibility, related_items, related_parties } = await request.json();

    const fields: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      fields.push('content = ?');
      values.push(content);
    }
    if (recordType !== undefined) {
      fields.push('record_type = ?');
      values.push(recordType);
    }
    if (tags !== undefined) {
      fields.push('tags = ?');
      values.push(tags);
    }
    if (visibility !== undefined) {
      fields.push('visibility = ?');
      values.push(visibility);
    }
    if (related_items !== undefined) {
      fields.push('related_items = ?');
      values.push(JSON.stringify(related_items));
    }
    if (related_parties !== undefined) {
      fields.push('related_parties = ?');
      values.push(JSON.stringify(related_parties));
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await pool.query(
      `UPDATE records SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新记录错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}

// 删除记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await pool.query(
      `DELETE FROM records WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除记录错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
