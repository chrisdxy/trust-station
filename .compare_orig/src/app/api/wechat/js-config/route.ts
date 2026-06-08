import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WECHAT_APPID = process.env.WECHAT_APPID || 'wx132561151d9c6e02';
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || '';

// 获取 access_token（实际生产应缓存）
async function getAccessToken(): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode) throw new Error(data.errmsg);
  return data.access_token;
}

// 获取 jsapi_ticket
async function getJsApiTicket(accessToken: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg);
  return data.ticket;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ success: false, error: '缺少 url' }, { status: 400 });

    const accessToken = await getAccessToken();
    const jsapiTicket = await getJsApiTicket(accessToken);
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    const signStr = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(signStr).digest('hex');

    return NextResponse.json({ success: true, appId: WECHAT_APPID, timestamp, nonceStr, signature });
  } catch (error: any) {
    console.error('JSSDK 配置失败:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
