import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取单个社区详情
export async function GET(request: NextRequest, context: any) {
  try {
    const communityId = context?.params?.id || '';
    const searchId = new URL(request.url).searchParams.get('id');
    const effectiveId = communityId || searchId;

    if (!effectiveId) {
      return NextResponse.json(
        { success: false, error: '请提供社区ID' },
        { status: 400 }
      );
    }

    // 获取社区详情
    const [communities] = await pool.query(
      `SELECT c.*, u.display_name as owner_name, u.phone as owner_phone
       FROM communities c
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE c.id = ?`,
      [effectiveId]
    ) as any[];

    if (!communities || communities.length === 0) {
      return NextResponse.json(
        { success: false, error: '社区不存在' },
        { status: 404 }
      );
    }

    // 获取社区成员
    const [members] = await pool.query(
      `SELECT cm.*, u.phone, u.avatar_url, u.display_name
       FROM community_members cm
       LEFT JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = ?`,
      [effectiveId]
    ) as any[];

    return NextResponse.json({
      success: true,
      community: communities[0],
      members: members || [],
    });
  } catch (error) {
    console.error('获取社区详情错误:', error);
    return NextResponse.json(
      { success: false, error: '获取社区详情失败' },
      { status: 500 }
    );
  }
}

// 更新社区
export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供社区ID' },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.category) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.max_members !== undefined) { fields.push('max_members = ?'); values.push(updates.max_members); }
    if (updates.cover_image) { fields.push('cover_image = ?'); values.push(updates.cover_image); }
    if (updates.rules !== undefined) { fields.push('rules = ?'); values.push(updates.rules); }
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await pool.query(
      `UPDATE communities SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新社区错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}

// 删除社区
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供社区ID' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM communities WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除社区错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
