import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/verifyCode';

export async function POST(request: NextRequest) {
  try {
    const { phone, verifyCode: code, type } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ success: false, error: '请提供手机号和验证码' }, { status: 400 });
    }

    // 使用真实的验证码校验（查询 verification_codes 表，校验过期和匹配）
    const check = await verifyCode(phone, code, type || 'login');

    if (!check.valid) {
      return NextResponse.json({ success: false, error: check.error || '验证码错误' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '验证成功' });
  } catch (error) {
    console.error('验证码验证错误:', error);
    return NextResponse.json({ success: false, error: '验证失败' }, { status: 500 });
  }
}
