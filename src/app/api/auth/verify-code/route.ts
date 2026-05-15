import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 验证码验证
export async function POST(request: NextRequest) {
  try {
    const { phone, verifyCode, type } = await request.json();

    if (!phone || !verifyCode) {
      return NextResponse.json(
        { success: false, error: '请提供手机号和验证码' },
        { status: 400 }
      );
    }

    // 模拟验证码验证（生产环境应使用真实的短信服务验证）
    // 这里检查验证码是否为 123456（测试用）或 6位数字
    if (verifyCode === '123456' || /^\d{6}$/.test(verifyCode)) {
      // 生成重置 token
      const resetToken = Buffer.from(`${phone}:${Date.now()}`).toString('base64');
      
      return NextResponse.json({
        success: true,
        message: '验证成功',
        token: resetToken,
      });
    }

    return NextResponse.json(
      { success: false, error: '验证码错误' },
      { status: 400 }
    );
  } catch (error) {
    console.error('验证码验证错误:', error);
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
