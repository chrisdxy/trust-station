import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const excludeId = searchParams.get('excludeId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT u.id, u.phone, u.display_name, u.real_name, u.user_type, u.company_name, 
             u.avatar_url, u.location, u.identity_verified,
             u.created_at,
             p.bio, p.expertise
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (excludeId) {
      sql += ` AND u.id != $${paramIndex}`;
      params.push(excludeId);
      paramIndex++;
    }
    
    if (search) {
      sql += ` AND (u.display_name ILIKE $${paramIndex} OR u.real_name ILIKE $${paramIndex} OR u.company_name ILIKE $${paramIndex} OR p.expertise ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`;
      const likeSearch = `%${search}%`;
      params.push(likeSearch);
      paramIndex++;
    }

    if (type === 'enterprise') {
      sql += " AND u.user_type = 'enterprise'";
    } else if (type === 'expert') {
      sql += " AND u.user_type = 'expert'";
    } else if (type === 'partner') {
      sql += ' AND u.identity_verified = true';
    }

    sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [result]: any = await pool.query(sql, params);
    return NextResponse.json({ success: true, users: result });
  } catch (error: any) {
    console.error('获取用户失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
