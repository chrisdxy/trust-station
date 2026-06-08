import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 批量获取用户信息
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids') || '';

    if (!ids) {
      return NextResponse.json({ success: false, error: '缺少 ids 参数' }, { status: 400 });
    }

    const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
    if (idList.length === 0) {
      return NextResponse.json({ success: true, users: [] });
    }

    const placeholders = idList.map(() => '?').join(',');
    const [result]: any = await pool.query(
      `SELECT id, phone, display_name, real_name, avatar_url FROM users WHERE id IN (${placeholders})`,
      idList
    );

    return NextResponse.json({ success: true, users: result });
  } catch (error: any) {
    console.error('批量获取用户失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
