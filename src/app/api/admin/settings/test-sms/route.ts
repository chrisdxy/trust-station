import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/sendSms';

export async function POST(request: NextRequest) {
  try {
    const { phone, config } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '请提供手机号' },
        { status: 400 }
      );
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    if (!config || !config.enabled) {
      return NextResponse.json(
        { success: false, error: '短信服务未启用，请先在设置中启用' },
        { status: 400 }
      );
    }

    // 发送测试短信（使用登录验证码模板，验证码固定为 888888 方便确认）
    const code = '888888';
    const result: any = await sendSms(config, phone, code, config.templateCodeLogin);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `测试短信已发送至 ${phone}，请注意查收`,
    });
  } catch (error: any) {
    console.error('[测试短信] 发送失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '测试短信发送失败' },
      { status: 500 }
    );
  }
}
