import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
    }

    const [[{ communities }]]: any = await pool.query(
      'SELECT COUNT(*) as communities FROM communities WHERE owner_id = ?',
      [userId]
    );
    const [[{ activities }]]: any = await pool.query(
      'SELECT COUNT(*) as activities FROM activities WHERE user_id = ?',
      [userId]
    );
    const [[{ projects }]]: any = await pool.query(
      'SELECT COUNT(*) as projects FROM projects WHERE user_id = ?',
      [userId]
    );

    return NextResponse.json({
      success: true,
      stats: {
        communities: communities || 0,
        activities: activities || 0,
        projects: projects || 0,
      },
    });
  } catch (error: any) {
    console.error('获取组织统计失败:', error?.message || error);
    return NextResponse.json({ success: false, error: '获取统计失败' }, { status: 500 });
  }
}
