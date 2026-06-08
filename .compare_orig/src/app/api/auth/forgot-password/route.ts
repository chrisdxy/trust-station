import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
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
    enabled: process.env.SMTP_ENABLED === 'true',
  };
}

async function sendEmail(to: string, subject: string, html: string, smtpConfig?: any) {
  const config = smtpConfig || await getSmtpConfig();
  if (!config.enabled || !config.host || !config.user || !config.pass) {
    throw new Error('SMTP未配置或未启用');
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to: to,
    subject: subject,
    html: html,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, smtpConfig } = body;
    if (!email) {
      return NextResponse.json({ success: false, error: '请提供邮箱地址' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: '邮箱格式不正确' }, { status: 400 });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    resetTokens.set(token, { email, expiresAt });
    const resetUrl = `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'https://myfriends.vip'}/reset-password?token=${token}`;
    try {
      await sendEmail(
        email,
        '正道驿站 - 密码重置',
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
        '<h2 style="color:#1a1a1a;">您好</h2>' +
        '<p style="color:#555;line-height:1.6;">我们收到了您的密码重置请求。如果您没有请求重置密码，请忽略此邮件。</p>' +
        '<div style="margin:30px 0;"><a href="' + resetUrl + '" style="display:inline-block;padding:12px 30px;background-color:#f59e0b;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">重置密码</a></div>' +
        '<p style="color:#888;font-size:14px;">此链接将在1小时后过期。<br/>或者您可以复制以下链接到浏览器打开：<br/><a href="' + resetUrl + '" style="color:#3b82f6;">' + resetUrl + '</a></p>' +
        '<hr style="border:none;border-top:1px solid #eee;margin:30px 0;"/>' +
        '<p style="color:#999;font-size:12px;">此邮件由系统自动发送，请勿回复。<br/>正道驿站 - 让每一次合作都有迹可循</p>' +
        '</div>',
        smtpConfig
      );
    } catch (emailError: any) {
      console.error('邮件发送失败:', emailError.message);
    }
    return NextResponse.json({ success: true, message: '如果该邮箱已注册，我们将发送密码重置链接' });
  } catch (error) {
    console.error('忘记密码请求失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误，请稍后重试' }, { status: 500 });
  }
}
