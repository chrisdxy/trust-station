import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import jwt from 'jsonwebtoken';
import { verifyCode } from '@/lib/verifyCode';

// 用户注册
export async function POST(request: NextRequest) {
  try {
    const { phone, password, verifyCode: code, display_name, real_name, user_type, company_name } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '请填写手机号' },
        { status: 400 }
      );
    }

    // 验证码注册
    if (code) {
      const check = await verifyCode(phone, code, 'register');
      if (!check.valid) {
        return NextResponse.json(
          { success: false, error: check.error },
          { status: 400 }
        );
      }
    } else if (!password) {
      // 既没有验证码也没有密码
      return NextResponse.json(
        { success: false, error: '请填写密码或验证码' },
        { status: 400 }
      );
    }

    // 检查手机号是否已存在
    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '该手机号已注册' },
        { status: 400 }
      );
    }

    const id = require('crypto').randomUUID();
    // 验证码注册时使用固定密码占位（实际登录走验证码）
    const finalPassword = password || 'sms_verified_' + id.slice(0, 8);
    await pool.query(
      `INSERT INTO users (id, phone, password, display_name, real_name, user_type, company_name, identity_verified, privacy_agreed, consensus_agreed, profile_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0)`,
      [id, phone, finalPassword, display_name || phone, real_name || '', user_type || 'individual', company_name || null]
    );

    // 注册成功后自动登录，生成 token
    const token = jwt.sign(
      { userId: id, phone, isAdmin: false },
      process.env.JWT_SECRET || 'zhengdao-secret-key',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      message: '注册成功',
      needsCompletion: true, // 注册后必须完善资料
      token,
      user: {
        id,
        phone,
        display_name: display_name || phone,
        user_type: user_type || 'individual',
      },
    });
  } catch (error: any) {
    console.error('用户注册错误:', error.message);
    return NextResponse.json(
      { success: false, error: '注册失败' },
      { status: 500 }
    );
  }
}
