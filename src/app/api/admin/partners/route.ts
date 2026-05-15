import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取合伙人申请列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const level = searchParams.get('level') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`pa.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    if (level) {
      whereConditions.push(`pa.level = $${paramIndex}`);
      params.push(level);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM partner_applications pa WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT pa.*, u.phone, u.display_name
       FROM partner_applications pa
       LEFT JOIN users u ON pa.user_id = u.id
       WHERE ${whereClause}
       ORDER BY pa.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      applications: result || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取合伙人申请错误:', error);
    return NextResponse.json(
      { success: false, error: '获取申请列表失败' },
      { status: 500 }
    );
  }
}

// 提交合伙人申请
export async function POST(request: NextRequest) {
  try {
    const { userId, userName, userPhone, level, region, businessPlan } = await request.json();

    if (!userId || !userName || !userPhone || !level) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 检查是否有待处理的申请
    const [existing]: any = await pool.query(
      'SELECT id FROM partner_applications WHERE user_id = ? AND status = ?',
      [userId, 'pending']
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '您已有待处理的申请' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO partner_applications (id, user_id, user_name, user_phone, level, region, business_plan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, userName, userPhone, level, region || null, businessPlan || null]
    );

    return NextResponse.json({
      success: true,
      message: '申请提交成功',
      id,
    });
  } catch (error) {
    console.error('提交合伙人申请错误:', error);
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    );
  }
}
