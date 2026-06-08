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
      // 创建者 OR 出现在 related_parties 字符串数组中作为有关方
      whereConditions.push(`(user_id = ? OR (related_parties IS NOT NULL AND related_parties != '' AND JSON_SEARCH(related_parties, 'one', ?) IS NOT NULL))`);
      params.push(userId, userId);
    }
    if (type) {
      // 支持逗号分隔的多个类型查询（FIND_IN_SET 匹配单个类型是否在逗号分隔字符串中）
      const types = type.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length > 1) {
        const typeConditions = types.map(() => `FIND_IN_SET(?, REPLACE(record_type, ' ', '')) > 0`).join(' OR ');
        whereConditions.push(`(${typeConditions})`);
        types.forEach(t => params.push(t));
      } else {
        whereConditions.push(`FIND_IN_SET(?, REPLACE(record_type, ' ', '')) > 0`);
        params.push(type);
      }
    }
    if (visibility) {
      whereConditions.push(`visibility = ?`);
      params.push(visibility);
    }
    if (keyword) {
      whereConditions.push(`(title LIKE ? OR content LIKE ? OR id LIKE ?)`);
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
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

    // 解析 JSON 字段（mysql2 可能已自动解析）
    const records = (result || []).map((row: any) => {
      let related_items: any[] = [];
      let related_parties: any[] = [];
      try { related_items = Array.isArray(row.related_items) ? row.related_items : (row.related_items ? JSON.parse(row.related_items) : []); } catch { related_items = []; }
      try { related_parties = Array.isArray(row.related_parties) ? row.related_parties : (row.related_parties ? JSON.parse(row.related_parties) : []); } catch { related_parties = []; }
      return {
        ...row,
        tags: row.tags || '',
        related_items,
        related_parties
      };
    });

    return NextResponse.json({
      success: true,
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('获取认知留痕错误:', error);
    return NextResponse.json(
      { success: false, error: '获取记录失败: ' + (error?.message || error?.code || '未知') },
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

    // 支持 recordType 为数组（多选），存储为逗号分隔字符串
    const recordTypeValue = Array.isArray(recordType) ? recordType.join(',') : (recordType || 'note');

    const id = uuidv4();
    await pool.query(
      `INSERT INTO records (id, user_id, title, content, record_type, tags, visibility, related_items, related_parties)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, title, content || '', recordTypeValue,
        tags || '', visibility || 'private',
        JSON.stringify(related_items || []),
        JSON.stringify(related_parties || [])
      ]
    );

    return NextResponse.json({
      success: true,
      message: '创建成功',
      id
    });
  } catch (error: any) {
    console.error('创建认知留痕错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败: ' + (error?.message || error?.code || '未知') },
      { status: 500 }
    );
  }
}
