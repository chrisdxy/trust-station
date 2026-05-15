import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取单个项目详情
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID' },
        { status: 400 }
      );
    }

    // 获取项目详情
    const [projects] = await pool.query(
      `SELECT p.*, u.display_name as creator_name, u.phone as creator_phone
       FROM projects p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [projectId]
    ) as any[];

    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 获取团队成员
    const [members] = await pool.query(
      `SELECT pm.*, u.phone, u.avatar_url
       FROM project_members pm
       LEFT JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?`,
      [projectId]
    ) as any[];

    return NextResponse.json({
      success: true,
      project: projects[0],
      members: members || [],
    });
  } catch (error) {
    console.error('获取项目详情错误:', error);
    return NextResponse.json(
      { success: false, error: '获取项目详情失败' },
      { status: 500 }
    );
  }
}

// 更新项目
export async function PUT(request: NextRequest) {
  try {
    const { id, updates } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID' },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.project_type) { fields.push('project_type = ?'); values.push(updates.project_type); }
    if (updates.budget !== undefined) { fields.push('budget = ?'); values.push(updates.budget); }
    if (updates.timeline !== undefined) { fields.push('timeline = ?'); values.push(updates.timeline); }
    if (updates.team_size !== undefined) { fields.push('team_size = ?'); values.push(updates.team_size); }
    if (updates.requirements !== undefined) { fields.push('requirements = ?'); values.push(updates.requirements); }
    if (updates.status) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.progress !== undefined) { fields.push('progress = ?'); values.push(updates.progress); }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await pool.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新项目错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除项目错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
