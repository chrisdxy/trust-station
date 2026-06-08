import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WECHAT_APPID = process.env.WECHAT_APPID || 'wx132561151d9c6e02';
const WECHAT_APPSECRET = process.env.WECHAT_APPSECRET || '';

// 内存缓存（token 有效期 7200s，提前 300s 刷新）
let tokenCache: { token: string; expiry: number } | null = null;
let ticketCache: { ticket: string; expiry: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiry) return tokenCache.token;
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_APPSECRET}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  if (data.errcode) throw new Error(data.errmsg);
  tokenCache = { token: data.access_token, expiry: Date.now() + 6900 * 1000 };
  return data.access_token;
}

async function getJsApiTicket(accessToken: string): Promise<string> {
  if (ticketCache && Date.now() < ticketCache.expiry) return ticketCache.ticket;
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg);
  ticketCache = { ticket: data.ticket, expiry: Date.now() + 6900 * 1000 };
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
