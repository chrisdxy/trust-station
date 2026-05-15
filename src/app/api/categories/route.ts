import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 公开API：获取分类列表（无需管理员权限）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    
    if (!type) {
      return NextResponse.json(
        { success: false, error: '缺少type参数' },
        { status: 400 }
      );
    }

    let sql = 'SELECT * FROM categories WHERE type = ?';
    const params: any[] = [type];

    sql += ' ORDER BY sort_order ASC, created_at ASC';

    const [rows]: any = await pool.query(sql, params);

    return NextResponse.json({
      success: true,
      categories: rows || [],
    });
  } catch (error: any) {
    console.error('获取分类列表错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取分类列表失败' },
      { status: 500 }
    );
  }
}
