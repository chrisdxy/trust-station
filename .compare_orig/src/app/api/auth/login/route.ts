import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { verifyCode } from '@/lib/verifyCode';

// 用户登录
export async function POST(request: NextRequest) {
  try {
    const { phone, password, verifyCode: code } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '请填写手机号' },
        { status: 400 }
      );
    }

    // 验证码登录
    if (code) {
      const check = await verifyCode(phone, code, 'login');
      if (!check.valid) {
        return NextResponse.json(
          { success: false, error: check.error },
          { status: 401 }
        );
      }
      // 验证码通过，查用户
      const [rows]: any = await pool.query(
        'SELECT * FROM users WHERE phone = ?',
        [phone]
      );
      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '该手机号未注册，请先注册' },
          { status: 401 }
        );
      }
      const user = rows[0];
      const token = jwt.sign(
        {
          userId: user.id,
          phone: user.phone,
          isAdmin: user.is_admin === 1 || user.is_admin === true,
        },
        process.env.JWT_SECRET || 'zhengdao-secret-key',
        { expiresIn: '7d' }
      );

      // 检查是否需要完善资料（未填真实姓名 / 未勾选隐私协议 / 未勾选六条共识）
      const needsCompletion =
        !user.real_name ||
        user.privacy_agreed === 0 ||
        user.consensus_agreed === 0 ||
        user.profile_completed === 0;

      return NextResponse.json({
        success: true,
        token,
        needsCompletion,
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
    }

    // 密码登录
    if (!password) {
      return NextResponse.json(
        { success: false, error: '请填写密码或验证码' },
        { status: 400 }
      );
    }

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE phone = ? AND password = ?',
      [phone, password]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '手机号或密码错误' },
        { status: 401 }
      );
    }

    const user = rows[0];

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        isAdmin: user.is_admin === 1 || user.is_admin === true,
      },
      process.env.JWT_SECRET || 'zhengdao-secret-key',
      { expiresIn: '7d' }
    );

    // 检查是否需要完善资料
    const needsCompletion =
      !user.real_name ||
      user.privacy_agreed === 0 ||
      user.consensus_agreed === 0 ||
      user.profile_completed === 0;

    return NextResponse.json({
      success: true,
      token,
      needsCompletion,
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
    console.error('用户登录错误:', error.message);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
