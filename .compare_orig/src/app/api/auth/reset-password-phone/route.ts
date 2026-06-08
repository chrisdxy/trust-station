import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 通过手机号重置密码
export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: '请提供手机号和新密码' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: '密码至少6位' },
        { status: 400 }
      );
    }

    // 更新用户密码
    const [result]: any = await pool.query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?',
      [password, phone]
    );

    if (!result || result.affectedRows === 0) {
      // 也尝试更新管理员表
      const [adminResult]: any = await pool.query(
        'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE phone = ?',
        [password, phone]
      );

      if (!adminResult || adminResult.affectedRows === 0) {
        return NextResponse.json(
          { success: false, error: '用户不存在' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    });
  } catch (error) {
    console.error('密码重置错误:', error);
    return NextResponse.json(
      { success: false, error: '重置失败' },
      { status: 500 }
    );
  }
}
