import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get SMS config from database
async function getSmsConfig() {
  try {
    const [result]: any = await pool.query(
      "SELECT config_value FROM system_config WHERE config_key = 'sms_config'"
    );
    
    if (result && result.length > 0) {
      return JSON.parse(result[0].config_value);
    }
  } catch (error) {
    console.error('Failed to get SMS config:', error);
  }
  return null;
}

// Aliyun SMS
async function sendSmsAliyun(config: any, phone: string, code: string, templateCodeOverride?: string) {
  try {
    const Core = require('@alicloud/pop-core');
    
    const client = new Core({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });
    
    const params = {
      PhoneNumbers: phone,
      SignName: config.signName,
      TemplateCode: templateCodeOverride || config.templateCodeLogin,
      TemplateParam: JSON.stringify({ code })
    };
    
    const result = await client.request('SendSms', params, {
      method: 'POST',
      timeout: 10000
    });
    
    return {
      success: result.Code === 'OK',
      message: result.Message || result.Code,
      requestId: result.RequestId
    };
  } catch (err: any) {
    let msg = err.message || 'Aliyun SMS failed';
    if (err.data) {
      try {
        const data = typeof err.data === 'string' ? JSON.parse(err.data) : err.data;
        msg = data?.Message || data?.message || msg;
      } catch {}
    }
    console.error('[Aliyun SMS] Failed:', msg, err);
    return { success: false, message: String(msg) };
  }
}

// Tencent Cloud SMS
async function sendSmsTencent(config: any, phone: string, code: string, templateCodeOverride?: string) {
  try {
    const tencentcloud = require('tencentcloud-sdk-nodejs-sms');
    const client = new tencentcloud.sms.v20190711.Client({
      credential: {
        secretId: config.accessKeyId,
        secretKey: config.accessKeySecret
      },
      region: 'ap-guangzhou'
    });
    
    const params = {
      SmsSdkAppId: config.appId || '',
      SignName: config.signName,
      TemplateId: templateCodeOverride || config.templateCodeLogin,
      TemplateParamSet: [code],
      PhoneNumberSet: [`+86${phone}`]
    };
    
    const resp = await client.SendSms(params);
    const result = resp.Response?.SendStatusSet?.[0];
    return {
      success: result?.Code === 'Ok',
      message: String(result?.Message || result?.Code || 'unknown')
    };
  } catch (err: any) {
    console.error('[Tencent SMS] Failed:', err);
    return { success: false, message: err.message || 'Tencent SMS failed' };
  }
}

// Submail SMS
async function sendSmsSubmail(config: any, phone: string, code: string) {
  try {
    const https = require('https');
    const querystring = require('querystring');
    
    const postData = querystring.stringify({
      appid: config.accessKeyId,
      signature: config.signName,
      project: config.templateCodeLogin,
      to: phone,
      vars: JSON.stringify({ code })
    });
    
    const auth = Buffer.from(`${config.accessKeyId}:${config.accessKeySecret}`).toString('base64');
    
    const options = {
      hostname: 'api.mysubmail.com',
      path: '/message/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${auth}`
      }
    };
    
    return new Promise(resolve => {
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              success: result.status === 'success',
              message: String(result.msg || result.status || 'unknown')
            });
          } catch {
            resolve({ success: false, message: 'Submail response parse failed' });
          }
        });
      });
      req.on('error', (err: any) => {
        resolve({ success: false, message: err.message });
      });
      req.write(postData);
      req.end();
    });
  } catch (err: any) {
    console.error('[Submail] Failed:', err);
    return { success: false, message: err.message || 'Submail failed' };
  }
}

// Unified SMS sending
async function sendSms(config: any, phone: string, code: string, templateCodeOverride?: string) {
  try {
    const provider = String(config?.provider || 'aliyun');
    
    if (config?.simulate) {
      const simInfo = {
        signName: config.signName,
        templateCode: templateCodeOverride || config.templateCodeLogin
      };
      console.log(`[SMS Simulate-${provider}] Phone: ${phone}, Code: ${code}, Config:`, simInfo);
      return { success: true, message: '[Simulate] SMS sent (not really)' };
    }
    
    console.log(`[SMS Send] Provider: ${provider}, Phone: ${phone}, Code: ${code}`);
    
    if (provider === 'aliyun') {
      return await sendSmsAliyun(config, phone, code, templateCodeOverride);
    } else if (provider === 'tencent') {
      return await sendSmsTencent(config, phone, code, templateCodeOverride);
    } else if (provider === 'submail') {
      return await sendSmsSubmail(config, phone, code);
    }
    return { success: false, message: `Unsupported SMS provider: ${provider}` };
  } catch (err: any) {
    console.error('[SMS Send] Unhandled error:', err);
    return { success: false, message: String(err.message || 'SMS send failed') };
  }
}

// POST handler - Send verification code
export async function POST(request: NextRequest) {
  try {
    const { phone, type } = await request.json();
    
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Please provide phone number' },
        { status: 400 }
      );
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      );
    }
    
    const smsConfig = await getSmsConfig();
    
    if (!smsConfig || !smsConfig.enabled) {
      return NextResponse.json(
        { success: false, error: 'SMS service not enabled' },
        { status: 400 }
      );
    }
    
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const codeType = type || 'login';
    
    await pool.query(
      'DELETE FROM verification_codes WHERE phone = ? AND type = ? AND used = 0',
      [phone, codeType]
    );
    
    const codeId = require('crypto').randomUUID();
    await pool.query(
      'INSERT INTO verification_codes (id, phone, code, type, expires_at, used) VALUES (?, ?, ?, ?, ?, 0)',
      [codeId, phone, code, codeType, expiresAt]
    );
    
    console.log(`[Verification Code Stored] Phone: ${phone}, Code: ${code}, Type: ${codeType}`);
    
    const result: any = await sendSms(smsConfig, phone, code);
    
    if (!result.success) {
      await pool.query(
        'DELETE FROM verification_codes WHERE id = ?',
        [codeId]
      );
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      code: code,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: any) {
    console.error('Send verification code error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Send failed' },
      { status: 500 }
    );
  }
}
