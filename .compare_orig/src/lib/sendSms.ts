import pool from '@/lib/db';

// Aliyun SMS
async function sendSmsAliyun(config: any, phone: string, code: string, templateCodeOverride?: string) {
  try {
    const Core = require('@alicloud/pop-core');
    
    const client = new Core({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25',
    });
    
    const params = {
      PhoneNumbers: phone,
      SignName: config.signName,
      TemplateCode: templateCodeOverride || config.templateCodeLogin,
      TemplateParam: JSON.stringify({ code }),
    };
    
    const result = await client.request('SendSms', params, {
      method: 'POST',
      timeout: 10000,
    });
    
    return {
      success: result.Code === 'OK',
      message: result.Message || result.Code,
      requestId: result.RequestId,
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
    const client = new tencentcloud.sms.v20210111.Client({
      credential: {
        secretId: config.accessKeyId,
        secretKey: config.accessKeySecret,
      },
      region: 'ap-guangzhou',
    });
    
    const params = {
      SmsSdkAppId: config.appId || '',
      SignName: config.signName,
      TemplateId: templateCodeOverride || config.templateCodeLogin,
      TemplateParamSet: [code],
      PhoneNumberSet: [`+86${phone}`],
    };
    
    const resp = await client.SendSms(params);
    const result = resp.Response?.SendStatusSet?.[0];
    return {
      success: result?.Code === 'Ok',
      message: String(result?.Message || result?.Code || 'unknown'),
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
      vars: JSON.stringify({ code }),
    });
    
    const auth = Buffer.from(`${config.accessKeyId}:${config.accessKeySecret}`).toString('base64');
    
    const options = {
      hostname: 'api.mysubmail.com',
      path: '/message/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${auth}`,
      },
    };
    
    return new Promise((resolve) => {
      const req = https.request(options, (res: any) => {
        let data = '';
        res.on('data', (chunk: string) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve({
              success: result.status === 'success',
              message: String(result.msg || result.status || 'unknown'),
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
export async function sendSms(config: any, phone: string, code: string, templateCodeOverride?: string) {
  try {
    const provider = String(config?.provider || 'aliyun');
    
    if (config?.simulate) {
      const simInfo = {
        signName: config.signName,
        templateCode: templateCodeOverride || config.templateCodeLogin,
      };
      console.log(`[SMS Simulate-${provider}] Phone: ${phone}, Code: ${code}`);
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
