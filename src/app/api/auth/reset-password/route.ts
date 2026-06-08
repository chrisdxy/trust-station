import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { resetTokens } from '@/lib/resetTokens';

async function getSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT || '587',
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM || '',
    fromName: process.env.SMTP_FROM_NAME || '正道驿站',
    enabled: process.env.SMTP_ENABLED === 'true'
  };
}

async function sendEmail(to: string, subject: string, html: string, smtpConfig?: any) {
  const config = smtpConfig || await getSmtpConfig();
  if (!config.enabled || !config.host || !config.user || !config.pass) {
    return;
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass }
  });
  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: to,
    subject: subject,
    html: html
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, smtpConfig } = body;
    if (!token || !password) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: '密码至少需要6个字符' }, { status: 400 });
    }
    const tokenData = resetTokens.get(token);
    if (!tokenData) {
      return NextResponse.json({ success: false, error: '无效的重置链接' }, { status: 400 });
    }
    if (new Date() > tokenData.expiresAt) {
      resetTokens.delete(token);
      return NextResponse.json({ success: false, error: '重置链接已过期，请重新申请' }, { status: 400 });
    }
    const email = tokenData.email;
    try {
      await sendEmail(
        email,
        '正道驿站 - 密码已重置',
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
        '<h2 style="color:#1a1a1a;">您好</h2>' +
        '<p style="color:#555;line-height:1.6;">您的密码已成功重置。</p>' +
        '<div style="background:#ecfdf5;padding:15px;border-radius:8px;margin:20px 0;"><p style="color:#047857;margin:0;">✓ 密码重置成功</p></div>' +
        '<p style="color:#888;font-size:14px;">如果您没有进行此操作，请立即联系管理员。</p>' +
        '<hr style="border:none;border-top:1px solid #eee;margin:30px 0;"/>' +
        '<p style="color:#999;font-size:12px;">此邮件由系统自动发送，请勿回复。<br/>正道驿站 - 让每一次合作都有迹可循</p>' +
        '</div>',
        smtpConfig
      );
    } catch (e) {
      console.error('发送通知邮件失败:', e);
    }
    resetTokens.delete(token);
    return NextResponse.json({ success: true, message: '密码重置成功' });
  } catch (error) {
    console.error('密码重置失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误，请稍后重试' }, { status: 500 });
  }
}
