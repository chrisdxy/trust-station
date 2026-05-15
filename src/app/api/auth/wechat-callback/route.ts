import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取微信公众号配置
async function getWechatConfig() {
  try {
    const [result]: any = await pool.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wechat_config'"
    );
    
    if (result && result.length > 0) {
      return JSON.parse(result[0].config_value);
    }
  } catch (error) {
    console.error('获取公众号配置失败:', error);
  }
  // 返回默认配置
  return {
    enabled: true,
    appId: process.env.WECHAT_APPID || 'wx132561151d9c6e02',
    appSecret: process.env.WECHAT_APPSECRET || '6e91355d05a72cbf05ea9690789f0e73',
  };
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: '缺少授权码' },
        { status: 400 }
      );
    }

    // 获取微信公众号配置
    const wechatConfig = await getWechatConfig();
    
    if (!wechatConfig.enabled) {
      return NextResponse.json(
        { success: false, error: '微信公众号登录未启用' },
        { status: 400 }
      );
    }

    const APPID = wechatConfig.appId;
    const APPSECRET = wechatConfig.appSecret;

    // 第一步：通过 code 获取 access_token 和 openid
    const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${APPID}&secret=${APPSECRET}&code=${code}&grant_type=authorization_code`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.errcode) {
      console.error('微信token获取失败:', tokenData);
      return NextResponse.json(
        { success: false, error: '微信授权失败: ' + (tokenData.errmsg || '未知错误') },
        { status: 400 }
      );
    }

    const { access_token, openid, refresh_token, scope } = tokenData;

    // 第二步：获取用户信息
    const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;
    
    const userInfoResponse = await fetch(userInfoUrl);
    const userInfo = await userInfoResponse.json();

    if (userInfo.errcode) {
      console.error('微信用户信息获取失败:', userInfo);
      // 如果用户信息获取失败，仍然可以返回基本openid
      return NextResponse.json({
        success: true,
        wechatUser: {
          openid,
          nickname: '微信用户',
          headimgurl: '',
          unionid: userInfo.unionid || '',
        }
      });
    }

    // 返回用户信息
    return NextResponse.json({
      success: true,
      wechatUser: {
        openid,
        nickname: userInfo.nickname || '微信用户',
        headimgurl: userInfo.headimgurl || '',
        unionid: userInfo.unionid || '',
        sex: userInfo.sex,
        province: userInfo.province,
        city: userInfo.city,
        country: userInfo.country,
      }
    });
  } catch (error) {
    console.error('微信回调处理错误:', error);
    return NextResponse.json(
      { success: false, error: '处理失败' },
      { status: 500 }
    );
  }
}
