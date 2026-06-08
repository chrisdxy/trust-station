import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

async function logError(msg: string, detail: any) {
  const logPath = path.join(process.cwd(), 'verify-face-error.log');
  const line = `[${new Date().toISOString()}] ${msg}: ${typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)}\n`;
  try { await writeFile(logPath, line, { flag: 'a' }); } catch {}
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, idcard, image, userId } = body;

    if (!name || !idcard) {
      return NextResponse.json({ success: false, error: '姓名和身份证号不能为空' }, { status: 400 });
    }
    if (!image) {
      return NextResponse.json({ success: false, error: '请上传人脸照片' }, { status: 400 });
    }

    const APPID = process.env.SHUMAI_APPID || '';
    const APP_SECURITY = process.env.SHUMAI_APP_SECURITY || '';

    if (!APPID || !APP_SECURITY) {
      return NextResponse.json({ success: false, error: '系统未配置认证服务' }, { status: 500 });
    }

    // 生成签名
    const timestamp = Date.now();
    const signStr = `${APPID}&${timestamp}&${APP_SECURITY}`;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

    // 调用数脉API（用表单方式提交）
    const formData = new URLSearchParams();
    formData.append('appid', APPID);
    formData.append('timestamp', String(timestamp));
    formData.append('sign', sign);
    formData.append('idcard', idcard);
    formData.append('name', name);
    formData.append('image', image);

    await logError('准备请求数脉API', { name, idcardLen: idcard.length, imageLen: image.length });

    const res = await fetch('https://api.shumaidata.com/v4/face_id_card/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: AbortSignal.timeout(15000)
    });

    await logError('数脉API响应', { status: res.status, statusText: res.statusText });

    const responseText = await res.text();
    await logError('数脉API响应体', { length: responseText.length, preview: responseText.substring(0, 200) });
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('数脉API响应不是有效JSON:', responseText.substring(0, 200));
      return NextResponse.json({ success: false, error: '认证服务响应异常' }, { status: 500 });
    }

    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: data.msg || '认证失败',
        code: data.code
      }, { status: 400 });
    }

    const score = data.data?.score || 0;
    const isMatch = score >= 0.45;

    // 如果比对成功，更新用户认证状态（数据库更新失败不影响认证结果）
    if (isMatch && userId) {
      try {
        await pool.query(
          'UPDATE users SET identity_verified = 1, id_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [idcard, userId]
        );
      } catch (dbErr: any) {
        await logError('数据库更新认证状态失败', { userId, error: dbErr?.message });
        console.error('数据库更新认证状态失败:', dbErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score,
        isMatch,
        message: data.data?.msg || (isMatch ? '认证成功' : '人脸不匹配'),
        incorrect: data.data?.incorrect,
        sex: data.data?.sex,
        birthday: data.data?.birthday,
        address: data.data?.address
      }
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errStack = error?.stack?.substring(0, 500) || '';
    await logError('verify-face 异常', { message: errMsg, stack: errStack });
    console.error('人脸认证失败:', errMsg);
    return NextResponse.json({ success: false, error: '认证服务异常: ' + errMsg }, { status: 500 });
  }
}
