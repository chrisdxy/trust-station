import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取微信公众号配置 - 直接从环境变量读取（不再查数据库）
async function getWechatConfig() {
  return {
    enabled: true,
    appId: process.env.WECHAT_APPID || 'wx132561151d9c6e02',
    appSecret: process.env.WECHAT_APPSECRET || '29a8031c6984cdc43b6a4664ae57a37b',
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
      const [fallback] = await pool.query(
        `SELECT u.id FROM social_accounts sa JOIN users u ON sa.user_id = u.id WHERE sa.provider = 'wechat' AND sa.openid = ?`,
        [openid]
      ) as any[];
      const isOldUser = fallback && fallback.length > 0;
      return NextResponse.json({
        success: true,
        isExistingUser: isOldUser,
        needsProfile: !isOldUser,
        wechatUser: {
          openid,
          nickname: '微信用户',
          headimgurl: '',
          unionid: userInfo.unionid || '',
        }
      });
    }

    // 检查是否已有注册用户（通过 openid 在 social_accounts 表中查找）
    const [existing] = await pool.query(
      `SELECT u.id, u.display_name, u.real_name, u.privacy_agreed, u.consensus_agreed
       FROM social_accounts sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.provider = 'wechat' AND sa.openid = ?`,
      [openid]
    ) as any[];

    const isExistingUser = existing && existing.length > 0;
    const userProfile = isExistingUser ? existing[0] : null;
    const needsProfile = !isExistingUser || userProfile?.privacy_agreed !== 1 || userProfile?.consensus_agreed !== 1;

    // 返回用户信息
    return NextResponse.json({
      success: true,
      isExistingUser,
      existingUserId: isExistingUser ? userProfile.id : null,
      needsProfile,
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
