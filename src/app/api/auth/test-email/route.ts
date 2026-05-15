import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, smtpConfig } = body;

    if (!to) {
      return NextResponse.json(
        { success: false, error: '请提供收件人邮箱' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 检查是否提供了配置
    if (!smtpConfig) {
      return NextResponse.json({
        success: false,
        error: '请先在管理后台配置SMTP并保存',
      });
    }

    // 检查SMTP是否启用
    if (!smtpConfig.enabled) {
      return NextResponse.json({
        success: false,
        error: '邮件服务未启用，请在设置中开启"启用邮件服务"开关',
      });
    }

    // 检查必要配置
    const missingFields: string[] = [];
    if (!smtpConfig.host) missingFields.push('SMTP服务器地址');
    if (!smtpConfig.user) missingFields.push('用户名/邮箱');
    if (!smtpConfig.pass) missingFields.push('密码/授权码');
    if (!smtpConfig.fromEmail) missingFields.push('发件人邮箱');

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `SMTP配置不完整，请填写以下字段：${missingFields.join('、')}`,
      });
    }

    // 创建邮件传输器
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port) || 587,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    // 发送测试邮件
    await transporter.sendMail({
      from: `"${smtpConfig.fromName || '正道驿站'}" <${smtpConfig.fromEmail}>`,
      to: to,
      subject: '正道驿站 - 邮件服务测试',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">邮件服务测试</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1a1a1a; margin-top: 0;">测试成功！</h2>
            <p style="color: #555; line-height: 1.8;">
              您好！<br/>
              这是一封来自<strong>正道驿站</strong>平台的测试邮件。<br/>
              如果您收到此邮件，说明邮件服务配置正确。
            </p>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #0369a1; margin: 0; font-size: 14px;">
                <strong>配置信息：</strong><br/>
                SMTP服务器: ${smtpConfig.host}:${smtpConfig.port}<br/>
                发件人: ${smtpConfig.fromName || '正道驿站'} &lt;${smtpConfig.fromEmail}&gt;
              </p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
            <p style="color: #888; font-size: 12px;">
              发送时间: ${new Date().toLocaleString('zh-CN')}<br/>
              正道驿站 - 让每一次合作都有迹可循
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: '测试邮件已发送，请检查收件箱',
    });

  } catch (error: any) {
    console.error('测试邮件发送失败:', error);
    
    // 解析错误信息，给出更友好的提示
    let errorMessage = '邮件发送失败，请检查SMTP配置';
    
    if (error.message) {
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '无法连接到SMTP服务器，请检查服务器地址和端口是否正确';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'SMTP认证失败，请检查用户名和密码（QQ邮箱需要使用授权码）';
      } else if (error.message.includes('ENVELOPE')) {
        errorMessage = '邮件地址无效，请检查收件人地址';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ESOCKET')) {
        errorMessage = '连接SMTP服务器超时，请检查网络或服务器地址是否正确';
      } else if (error.message.includes('Invalid login')) {
        errorMessage = '登录失败，请确认用户名密码正确（注意：QQ邮箱需使用授权码而非登录密码）';
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
