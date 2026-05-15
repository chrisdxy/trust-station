import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取协调记录列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (userId) {
      whereConditions.push(`user_id = ?`);
      params.push(userId);
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
        totalPages: Math.ceil(total / limit),
      },
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
    const { userId, applicantName, respondentName, disputeType, description, evidence } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO mediations (id, user_id, applicant_name, respondent_name, dispute_type, description, evidence, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, applicantName || '', respondentName || '', disputeType || '', description || '', evidence || '']
    );

    return NextResponse.json({
      success: true,
      message: '申请已提交',
      id,
    });
  } catch (error) {
    console.error('创建协调申请错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败' },
      { status: 500 }
    );
  }
}
