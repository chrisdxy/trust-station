import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    // 从 Authorization header 或 cookie 获取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('token')?.value || null;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    // 验证 JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'zhengdao-secret-key');
    } catch {
      return NextResponse.json(
        { success: false, error: '令牌无效或已过期' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const [rows]: any = await pool.query(
      'SELECT id, phone, display_name, real_name, user_type, company_name, identity_verified, avatar_url, is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    const user = rows[0];
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        display_name: user.display_name,
        real_name: user.real_name,
        user_type: user.user_type,
        company_name: user.company_name,
        identity_verified: user.identity_verified,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin === 1 || user.is_admin === true,
      },
    });
  } catch (error: any) {
    console.error('获取用户信息错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
