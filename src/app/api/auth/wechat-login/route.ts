import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Generate token
function generateToken(openid: string): string {
  return Buffer.from(`${openid}:${Date.now()}`).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { openid, nickname, realName, phone, avatarUrl, privacyAgreed, consensusAgreed } = body;

    if (!openid) {
      return NextResponse.json(
        { success: false, error: 'Missing openid parameter' },
        { status: 400 }
      );
    }

    // Check if wechat binding exists
    const [existingRows] = await pool.query(
      'SELECT * FROM social_accounts WHERE provider = "wechat" AND openid = ?',
      [openid]
    ) as any[];

    let userId: string | null = null;
    let isNewUser = false;
    let userPhone: string | null = null;
    let userRealName: string | null = null;
    let userDisplayName: string | null = null;
    let userPrivacyAgreed: number = 0;
    let userConsensusAgreed: number = 0;

    if (existingRows && existingRows.length > 0) {
      // Existing binding: read full user info from database
      userId = existingRows[0].user_id;

      // Query user profile
      const [userRows] = await pool.query(
        'SELECT phone, display_name, real_name, privacy_agreed, consensus_agreed FROM users WHERE id = ?',
        [userId]
      ) as any[];

      if (userRows && userRows.length > 0) {
        userPhone = userRows[0].phone;
        userRealName = userRows[0].real_name;
        userDisplayName = userRows[0].display_name;
        userPrivacyAgreed = userRows[0].privacy_agreed;
        userConsensusAgreed = userRows[0].consensus_agreed;
      }

      // Update wechat user info
      await pool.query(
        `UPDATE social_accounts SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = "wechat" AND openid = ?`,
        [nickname || realName, openid]
      );
    } else {
      // Create new binding
      isNewUser = true;

      // Check if there's a user linked by phone
      if (phone) {
        const [userRows] = await pool.query(
          'SELECT id FROM users WHERE phone = ?',
          [phone]
        ) as any[];

        if (userRows && userRows.length > 0) {
          userId = userRows[0].id;
        }
      }

      // If no user, create one
      if (!userId) {
        if (!phone) {
          return NextResponse.json(
            { success: false, error: 'Phone number is required' },
            { status: 400 }
          );
        }
        userId = 'UID' + phone;
        await pool.query(
          `INSERT INTO users (id, phone, password, display_name, real_name, avatar_url, user_type) VALUES (?, ?, ?, ?, ?, ?, 'individual')`,
          [userId, phone, '', nickname || realName || '微信用户', realName || nickname || '', avatarUrl || '']
        );
      }

      // Create wechat binding record
      await pool.query(
        `INSERT INTO social_accounts (id, user_id, provider, openid, nickname, bind_status)
         VALUES (?, ?, "wechat", ?, ?, "bound")`,
        ['sa-' + Date.now(), userId, openid, nickname || realName]
      );

      userPhone = phone;
      userRealName = realName;
    }

    // Update user info when new data is provided
    if (nickname || realName || phone || avatarUrl || privacyAgreed || consensusAgreed) {
      const updates: string[] = [];
      const values: any[] = [];

      // 昵称冲突处理：已有昵称且微信昵称等于真实姓名时，保留原昵称
      if (nickname) {
        if (isNewUser || !userDisplayName) {
          // 新用户或没有昵称 → 使用微信昵称
          updates.push('display_name = ?');
          values.push(nickname);
        } else if (nickname !== realName && userDisplayName !== realName && nickname !== userDisplayName) {
          // 微信昵称 ≠ 真实姓名，原昵称 ≠ 真实姓名，且两者不同 → 保留原昵称，不覆盖
          // 前端后续可通过接口提示用户选择
        }
        // 其他情况（微信昵称=真实姓名 或 原昵称=真实姓名 或 两者相同）→ 保留原昵称
      }
      if (realName) {
        updates.push('real_name = ?');
        values.push(realName);
      }
      if (phone) {
        updates.push('phone = ?');
        values.push(phone);
      }
      if (avatarUrl) {
        updates.push('avatar_url = ?');
        values.push(avatarUrl);
      }
      // Save privacy and consensus agreement
      if (privacyAgreed) {
        updates.push('privacy_agreed = 1');
      }
      if (consensusAgreed) {
        updates.push('consensus_agreed = 1');
      }
      // Profile completion check
      const finalPhone = phone || userPhone;
      const finalRealName = realName || userRealName;
      const finalPrivacyAgreed = privacyAgreed || userPrivacyAgreed;
      const finalConsensusAgreed = consensusAgreed || userConsensusAgreed;

      if (finalPhone && finalRealName && finalPrivacyAgreed && finalConsensusAgreed) {
        updates.push('profile_completed = 1');
      }

      if (updates.length > 0) {
        values.push(userId);
        await pool.query(
          `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          values
        );
      }
    }

    const token = generateToken(openid);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: userId,
        openid,
        nickname: nickname || realName || '微信用户',
        display_name: userDisplayName || nickname || realName || '微信用户',
        realName: userRealName,
        phone: userPhone,
        isNewUser,
        profileComplete: !!(userPhone && userRealName && userPrivacyAgreed && userConsensusAgreed),
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Wechat login error:', error);
    const message = error?.message || String(error);
    return NextResponse.json(
      { success: false, error: 'Login failed: ' + message },
      { status: 500 }
    );
  }
}
