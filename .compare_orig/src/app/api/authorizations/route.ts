import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const scope = searchParams.get('scope');

    let sql = `SELECT a.*, 
      u.display_name as grantor_display_name, 
      u.real_name as grantor_real_name,
      u.phone as grantor_phone
      FROM authorizations a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1`;
    const params: any[] = [];

    if (userId) {
      sql += ` AND a.user_id = ?`;
      params.push(userId);
    }
    if (status && status !== 'all') {
      sql += ` AND a.status = ?`;
      params.push(status);
    }
    if (scope) {
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
    console.log('[API authorizations POST] 收到请求');
    const body = await request.json();
    console.log('[API authorizations POST] body:', JSON.stringify(body));
    
    const { userId, partner_id, authorized_record_ids, scope, description, expiry_date, relationship_id, partner_name, grantee_email } = body;
    console.log('[API authorizations POST] 解析参数:', { userId, partner_id, authorized_record_ids });
    
    // 支持单个 authorized_record_id 或逗号分隔的 authorized_record_ids
    const recordIds: string[] = authorized_record_ids 
      ? (Array.isArray(authorized_record_ids) ? authorized_record_ids : authorized_record_ids.split(',').map((s: string) => s.trim()).filter(Boolean))
      : [];
    
    if (!userId || !partner_id || recordIds.length === 0) {
      console.log('[API authorizations POST] 缺少参数');
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const scopeValue = Array.isArray(scope) ? scope.join(',') : (scope || 'read');
    
    // 为每个记录各创建一条授权
    const insertSql = `
      INSERT INTO authorizations (user_id, grantee_id, grantee_email, grantee_name, relationship_id, scope, description, expiry_date, authorized_record_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertedIds: number[] = [];
    for (const recordId of recordIds) {
      const [result]: any = await pool.query(insertSql, [
        userId, 
        partner_id, 
        grantee_email || null, 
        partner_name || null, 
        relationship_id || null, 
        scopeValue, 
        description || null, 
        expiry_date || null,
        recordId,
        'active'
      ]);
      insertedIds.push(result.insertId);
    }
    
    console.log('[API authorizations POST] 保存成功, ids:', insertedIds);
    return NextResponse.json({ success: true, ids: insertedIds, count: insertedIds.length });
  } catch (error: any) {
    console.error('[API authorizations POST] 创建授权失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, grantee_name, scope, description, expiry_date, status } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少授权ID' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (grantee_name !== undefined) { updates.push('grantee_name = ?'); params.push(grantee_name); }
    if (scope !== undefined) {
      const scopeValue = Array.isArray(scope) ? scope.join(',') : scope;
      updates.push('scope = ?'); params.push(scopeValue);
    }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (expiry_date !== undefined) { updates.push('expiry_date = ?'); params.push(expiry_date || null); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await pool.query(
      `UPDATE authorizations SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('[API authorizations PUT] 更新授权失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
