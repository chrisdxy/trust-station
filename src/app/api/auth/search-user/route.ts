import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 搜索用户
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({
        success: true,
        users: [],
        message: '请输入至少2个字符的搜索关键词'
      });
    }

    // 搜索用户（按手机号或姓名）
    const searchPattern = `%${keyword}%`;
    const [rows] = await pool.query(
      `SELECT id, phone, display_name as displayName, real_name as realName, user_type, avatar_url as avatar
       FROM users 
       WHERE (phone LIKE ? OR display_name LIKE ? OR real_name LIKE ?) AND phone != ''
       LIMIT ?`,
      [searchPattern, searchPattern, searchPattern, limit]
    ) as any[];

    const results = (rows || []).map((user: any) => ({
      id: user.id,
      phone: user.phone,
      displayName: user.realName || user.displayName || '用户' + (user.phone || '').slice(-4),
      realName: user.realName,
      nickname: user.displayName,
      avatar: user.avatar,
      userType: user.user_type
    }));

    return NextResponse.json({
      success: true,
      users: results,
      count: results.length
    });
  } catch (error) {
    console.error('搜索用户错误:', error);
    return NextResponse.json(
      { success: false, error: '搜索失败' },
      { status: 500 }
    );
  }
}
