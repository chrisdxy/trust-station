import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 查询公开维权记录（按被公开人姓名或手机号）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    if (!q || q.trim().length < 1) {
      return NextResponse.json({ success: false, error: '请输入查询关键词' }, { status: 400 });
    }

    const keyword = `%${q.trim()}%`;
    const [result]: any = await pool.query(
      `SELECT pr.*, 
        COALESCE(u.display_name, u.real_name) as applicant_name
       FROM public_records pr
       LEFT JOIN users u ON pr.applicant_id = u.id
       WHERE pr.status = 'approved'
         AND (pr.public_person_name LIKE ? OR pr.public_person_phone LIKE ?)
       ORDER BY pr.updated_at DESC
       LIMIT 50`,
      [keyword, keyword]
    );

    return NextResponse.json({ success: true, records: result });
  } catch (error: any) {
    console.error('查询公开记录失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
