import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 用户搜索接口
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

    // 搜索 profiles 表
    const [profilesRows]: any = await pool.query(
      'SELECT id, name, company, position, avatar FROM profiles WHERE name LIKE ? OR company LIKE ? LIMIT 10',
      [`%${q}%`, `%${q}%`]
    );

    // 搜索 users 表（补充手机号）
    const [usersRows]: any = await pool.query(
      'SELECT id, phone, display_name, real_name, avatar_url FROM users WHERE display_name LIKE ? OR real_name LIKE ? OR phone LIKE ? LIMIT 10',
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    // 合并结果
    const usersMap = new Map();
    
    profilesRows.forEach((row: any) => {
      usersMap.set(row.id, {
        id: String(row.id),
        name: row.name,
        display_name: row.name,
        real_name: row.name,
        company: row.company,
        position: row.position,
        avatar_url: row.avatar,
      });
    });

    usersRows.forEach((row: any) => {
      if (!usersMap.has(row.id)) {
        usersMap.set(row.id, {
          id: String(row.id),
          phone: row.phone,
          name: row.display_name || row.real_name,
          display_name: row.display_name,
          real_name: row.real_name,
          avatar_url: row.avatar_url,
        });
      } else {
        // 补充手机号
        const existing = usersMap.get(row.id);
        existing.phone = row.phone;
      }
    });

    const users = Array.from(usersMap.values()).slice(0, 10);

    return NextResponse.json({
      success: true,
      users: users,
    });
  } catch (error: any) {
    console.error('用户搜索错误:', error.message);
    return NextResponse.json(
      { success: false, error: '搜索失败: ' + error.message },
      { status: 500 }
    );
  }
}
