import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取合作关系列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const level = searchParams.get('level') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['r.user_id = ?'];
    const params: any[] = [userId];

    if (level) {
      whereConditions.push(`r.cooperation_level = ?`);
      params.push(level);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM relationships r WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT * FROM relationships WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      relationships: result || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取合作关系错误:', error);
    return NextResponse.json(
      { success: false, error: '获取合作关系失败' },
      { status: 500 }
    );
  }
}

// 添加合作关系
export async function POST(request: NextRequest) {
  try {
    const { userId, partnerId, partnerName, partnerType, relationshipType, cooperationLevel, notes } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO relationships (id, user_id, partner_id, partner_name, partner_type, relationship_type, cooperation_level, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, partnerId || null, partnerName || '', partnerType || 'individual', relationshipType || '', cooperationLevel || 'potential', notes || '']
    );

    return NextResponse.json({
      success: true,
      message: '添加成功',
      id,
    });
  } catch (error) {
    console.error('添加合作关系错误:', error);
    return NextResponse.json(
      { success: false, error: '添加失败' },
      { status: 500 }
    );
  }
}
