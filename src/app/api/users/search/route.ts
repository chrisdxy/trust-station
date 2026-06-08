import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 用户搜索接口（仅查询 users 表 — UID+手机号为主ID，company/position 已从 profiles 迁移）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q');
    
    // 至少需要一个搜索条件
    if (!q) {
      return NextResponse.json(
        { success: false, error: '请输入搜索关键词' },
        { status: 400 }
      );
    }

    // 搜索 users 表（所有字段统一在这里）
    const [usersRows]: any = await pool.query(
      `SELECT id, phone, display_name, real_name, avatar_url, identity_verified, company, position
       FROM users
       WHERE display_name LIKE ? OR real_name LIKE ? OR phone LIKE ?
       LIMIT 10`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    const users = usersRows.map((row: any) => ({
      id: String(row.id),
      phone: row.phone,
      name: row.display_name || row.real_name,
      display_name: row.display_name,
      real_name: row.real_name,
      avatar_url: row.avatar_url,
      identity_verified: !!row.identity_verified,
      company: row.company,
      position: row.position
    }));

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error: any) {
    console.error('用户搜索错误:', error.message);
    return NextResponse.json(
      { success: false, error: '搜索失败: ' + error.message },
      { status: 500 }
    );
  }
}
