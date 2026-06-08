import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取协调记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || '';
    const assignedTo = searchParams.get('assignedTo') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (userId) {
      if (role === 'respondent') {
        whereConditions.push(`respondent_id = ?`);
      } else {
        whereConditions.push(`user_id = ?`);
      }
      params.push(userId);
    }
    if (assignedTo) {
      whereConditions.push(`assigned_to = ?`);
      params.push(assignedTo);
    }
    if (status) {
      whereConditions.push(`status = ?`);
      params.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM mediations WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT * FROM mediations WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      mediations: result || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取协调记录错误:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

// 创建协调申请
export async function POST(request: NextRequest) {
  try {
    const { userId, applicantName, respondentId, respondentName, title, disputeType, description, evidence, expectedResult } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO mediations (id, user_id, applicant_name, respondent_id, respondent_name, title, dispute_type, description, evidence, expected_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unassigned')`,
      [id, userId, applicantName || '', respondentId || '', respondentName || '', title || '', disputeType || '', description || '', evidence || '', expectedResult || '']
    );

    return NextResponse.json({
      success: true,
      message: '申请已提交',
      id
    });
  } catch (error) {
    console.error('创建协调申请错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败' },
      { status: 500 }
    );
  }
}

// 更新协调状态
export async function PUT(request: NextRequest) {
  try {
    const { id, status, assignedTo, assignmentStatus } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }
    const updates: string[] = [];
    const values: any[] = [];
    if (status) { updates.push('status = ?'); values.push(status); }
    if (assignedTo !== undefined) { updates.push('assigned_to = ?'); values.push(assignedTo); }
    if (assignmentStatus !== undefined) { updates.push('assignment_status = ?'); values.push(assignmentStatus); }
    if (updates.length === 0) return NextResponse.json({ success: false, error: '无变更' }, { status: 400 });
    updates.push('updated_at = NOW()');
    values.push(id);
    await pool.query(`UPDATE mediations SET ${updates.join(', ')} WHERE id = ?`, values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新协调状态失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}
