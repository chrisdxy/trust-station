import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const scope = searchParams.get('scope');

    let sql = `
      SELECT a.*, 
             u.display_name as grantor_name,
             r.title as relationship_title,
             r.serial_number as relationship_serial
      FROM authorizations a
      LEFT JOIN users u ON a.grantor_id = u.id
      LEFT JOIN relationships r ON a.relationship_id = r.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId) {
      sql += ` AND a.grantor_id = ?`;
      params.push(userId);
    }
    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (scope) {
      // scope 支持多类型查询（逗号分隔），使用 FIND_IN_SET
      const scopes = scope.split(',');
      const scopeConditions = scopes.map(() => 'FIND_IN_SET(?, a.scope) > 0').join(' OR ');
      sql += ` AND (${scopeConditions})`;
      scopes.forEach(s => params.push(s));
    }

    sql += ' ORDER BY a.created_at DESC';

    const [result]: any = await pool.query(sql, params);
    return NextResponse.json({ success: true, authorizations: result });
  } catch (error: any) {
    console.error('获取授权失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, partner_id, authorized_record_id, scope, description, expiry_date, relationship_id, relationship_title } = body;

    if (!userId || !partner_id || !authorized_record_id) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const id = `AUTH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // 支持 scope 为数组（多选记录类型），存储为逗号分隔字符串
    const scopeValue = Array.isArray(scope) ? scope.join(',') : (scope || 'read');
    
    const sql = `
      INSERT INTO authorizations (id, grantor_id, grantee_id, grantee_email, grantee_name, relationship_id, relationship_title, scope, status, description, expiry_date, authorized_record_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `;
    
    await pool.query(sql, [
      id, 
      userId, 
      partner_id, 
      '', 
      '', 
      relationship_id || null, 
      relationship_title || null, 
      scopeValue, 
      description || '', 
      expiry_date || null,
      authorized_record_id
    ]);
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error('创建授权失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
