import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const userId = searchParams.get('userId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (status) {
      whereConditions.push(`p.status = ?`);
      params.push(status);
    }
    if (type) {
      whereConditions.push(`p.project_type = ?`);
      params.push(type);
    }
    if (userId) {
      whereConditions.push(`p.user_id = ?`);
      params.push(userId);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM projects p WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT p.*, u.display_name as creator_name
       FROM projects p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      projects: result || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// 创建项目
export async function POST(request: NextRequest) {
  try {
    const { userId, title, description, coverImage, projectType, industry, location, budget, timeline, teamSize, requirements } = await request.json();

    if (!userId || !title) {
      return NextResponse.json(
        { success: false, error: '请填写必填信息' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO projects (id, user_id, title, description, cover_image, project_type, industry, location, budget, timeline, team_size, requirements, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [id, userId, title, description || '', coverImage || '', projectType || '', industry || '', location || '', budget || null, timeline || '', teamSize || null, requirements || '']
    );

    return NextResponse.json({
      success: true,
      message: '项目创建成功',
      id,
    });
  } catch (error) {
    console.error('创建项目错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败' },
      { status: 500 }
    );
  }
}
