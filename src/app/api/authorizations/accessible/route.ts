import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const scope = searchParams.get('scope'); // 支持多类型过滤（逗号分隔）

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    let scopeCondition = '';
    const params: any[] = [userId];
    
    if (scope) {
      const scopes = scope.split(',');
      const scopeConditions = scopes.map(() => 'FIND_IN_SET(?, a.scope) > 0').join(' OR ');
      scopeCondition = ` AND (${scopeConditions})`;
      scopes.forEach(s => params.push(s));
    }

    // 获取用户被授权访问的记录
    // 被授权人能看到授权方分享给他的记录
    const sql = `
      SELECT r.*, 
             a.id as authorization_id,
             a.grantor_id,
             u.display_name as grantor_name,
             u.real_name as grantor_real_name,
             a.scope,
             a.description as auth_description,
             a.created_at as auth_created_at
      FROM authorizations a
      JOIN records r ON a.authorized_record_id = r.id
      LEFT JOIN users u ON a.grantor_id = u.id
      WHERE a.grantee_id = ? 
        AND a.status IN ('active', 'pending')
        AND (a.expiry_date IS NULL OR a.expiry_date > NOW())
        ${scopeCondition}
      ORDER BY a.created_at DESC
    `;

    const [result]: any = await pool.query(sql, params);
    
    return NextResponse.json({ success: true, records: result });
  } catch (error: any) {
    console.error('获取可访问记录失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
