import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 管理员登录
export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: '请填写手机号和密码' },
        { status: 400 }
      );
    }

    const [rows]: any = await pool.query(
      'SELECT * FROM admins WHERE phone = ? AND password = ?',
      [phone, password]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '手机号或密码错误' },
        { status: 401 }
      );
    }

    const admin = rows[0];

    if (admin.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 403 }
      );
    }

    // 返回管理员信息（不包含密码）
    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        phone: admin.phone,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error: any) {
    console.error('管理员登录错误:', error.message);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
