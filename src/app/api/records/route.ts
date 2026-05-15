import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取认知留痕列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type') || '';
    const visibility = searchParams.get('visibility') || '';
    const keyword = searchParams.get('keyword') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (userId) {
      whereConditions.push(`user_id = ?`);
      params.push(userId);
    }
    if (type) {
      whereConditions.push(`record_type = ?`);
      params.push(type);
    }
    if (visibility) {
      whereConditions.push(`visibility = ?`);
      params.push(visibility);
    }
    if (keyword) {
      whereConditions.push(`(title LIKE ? OR content LIKE ?)`);
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM records WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT * FROM records WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 解析 JSON 字段
    const records = (result || []).map((row: any) => ({
      ...row,
      tags: row.tags || '',
      related_items: row.related_items ? JSON.parse(row.related_items) : [],
      related_parties: row.related_parties ? JSON.parse(row.related_parties) : [],
    }));

    return NextResponse.json({
      success: true,
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取认知留痕错误:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败' },
      { status: 500 }
    );
  }
}

// 创建认知留痕
export async function POST(request: NextRequest) {
  try {
    const { userId, title, content, recordType, tags, visibility, related_items, related_parties } = await request.json();

    if (!userId || !title) {
      return NextResponse.json(
        { success: false, error: '请填写必填信息' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO records (id, user_id, title, content, record_type, tags, visibility, related_items, related_parties)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, title, content || '', recordType || 'note', tags || '', visibility || 'private',
        JSON.stringify(related_items || []),
        JSON.stringify(related_parties || []),
      ]
    );

    return NextResponse.json({
      success: true,
      message: '创建成功',
      id,
    });
  } catch (error) {
    console.error('创建认知留痕错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败' },
      { status: 500 }
    );
  }
}
