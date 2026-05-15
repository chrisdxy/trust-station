import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取记录的相关方（合作方）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 首先获取记录信息
    const [recordResult]: any = await pool.query(
      'SELECT * FROM records WHERE id = ?',
      [id]
    );

    const record = recordResult?.[0];
    if (!record) {
      return NextResponse.json(
        { success: false, error: '记录不存在' },
        { status: 404 }
      );
    }

    // 获取与该用户有合作关系的用户列表
    // 从 relationships 表获取合作方
    const [relationships]: any = await pool.query(
      `SELECT r.*, 
              CASE WHEN r.user_id = ? THEN r.partner_id ELSE r.user_id END as partner_user_id
       FROM relationships r
       WHERE (r.user_id = ? OR r.partner_id = ?) AND r.status = 'active'`,
      [userId, userId, userId]
    );

    // 获取合作方的用户信息
    const partnerIds = relationships.map((r: any) => r.partner_user_id);
    let parties: any[] = [];

    if (partnerIds.length > 0) {
      const placeholders = partnerIds.map(() => '?').join(',');
      const [users]: any = await pool.query(
        `SELECT id, display_name, real_name, user_type FROM users WHERE id IN (${placeholders})`,
        partnerIds
      );
      parties = users.map((u: any) => ({
        id: u.id,
        name: u.real_name || u.display_name || '未命名',
        role: 'partner',
        type: u.user_type
      }));
    }

    return NextResponse.json({
      success: true,
      parties
    });
  } catch (error) {
    console.error('获取记录相关方错误:', error);
    return NextResponse.json(
      { success: false, error: '获取相关方失败' },
      { status: 500 }
    );
  }
}
