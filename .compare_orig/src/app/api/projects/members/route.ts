import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 添加项目成员
export async function POST(request: NextRequest) {
  try {
    const { projectId, userId, userName, role } = await request.json();

    if (!projectId || !userId) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID和用户ID' },
        { status: 400 }
      );
    }

    // 检查项目是否存在
    const [projects] = await pool.query(
      'SELECT * FROM projects WHERE id = ?',
      [projectId]
    ) as any[];

    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // 检查是否已是成员
    const [existing] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    ) as any[];

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '该用户已是项目成员' },
        { status: 400 }
      );
    }

    const id = 'pmm-' + Date.now();
    await pool.query(
      `INSERT INTO project_members (id, project_id, user_id, user_name, role) VALUES (?, ?, ?, ?, ?)`,
      [id, projectId, userId, userName || '', role || 'member']
    );

    // 更新团队规模
    await pool.query(
      'UPDATE projects SET team_size = team_size + 1 WHERE id = ?',
      [projectId]
    );

    return NextResponse.json({
      success: true,
      message: '添加成功',
      id,
    });
  } catch (error) {
    console.error('添加项目成员错误:', error);
    return NextResponse.json(
      { success: false, error: '添加失败' },
      { status: 500 }
    );
  }
}

// 移除项目成员
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const memberId = searchParams.get('memberId');
    const userId = searchParams.get('userId');

    const targetUserId = memberId || userId;

    if (!projectId || !targetUserId) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID和成员ID' },
        { status: 400 }
      );
    }

    // 检查是否是创建者
    const [projects] = await pool.query(
      'SELECT user_id FROM projects WHERE id = ?',
      [projectId]
    ) as any[];

    if (projects && projects[0]?.user_id === targetUserId) {
      return NextResponse.json(
        { success: false, error: '不能移除项目创建者' },
        { status: 400 }
      );
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, targetUserId]
    );

    // 更新团队规模
    await pool.query(
      'UPDATE projects SET team_size = GREATEST(1, team_size - 1) WHERE id = ?',
      [projectId]
    );

    return NextResponse.json({
      success: true,
      message: '移除成功',
    });
  } catch (error) {
    console.error('移除项目成员错误:', error);
    return NextResponse.json(
      { success: false, error: '移除失败' },
      { status: 500 }
    );
  }
}

// 获取项目成员列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID' },
        { status: 400 }
      );
    }

    const [members] = await pool.query(
      `SELECT pm.*, u.phone, u.avatar_url, u.display_name, u.real_name
       FROM project_members pm
       LEFT JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY pm.role = 'owner' DESC, pm.joined_at ASC`,
      [projectId]
    ) as any[];

    return NextResponse.json({
      success: true,
      members: members || [],
    });
  } catch (error) {
    console.error('获取项目成员错误:', error);
    return NextResponse.json(
      { success: false, error: '获取失败' },
      { status: 500 }
    );
  }
}
