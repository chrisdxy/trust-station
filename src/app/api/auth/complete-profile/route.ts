import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { phone, display_name, real_name, user_type, company_name, privacy_agreed, consensus_agreed } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: '请提供手机号' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const [existingResult]: any = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );

    if (existingResult && existingResult.length > 0) {
      // 更新现有用户
      const fields: string[] = [];
      const values: any[] = [];

      if (display_name) {
        fields.push('display_name = ?');
        values.push(display_name);
      }
      if (real_name) {
        fields.push('real_name = ?');
        values.push(real_name);
      }
      if (user_type) {
        fields.push('user_type = ?');
        values.push(user_type);
      }
      if (company_name) {
        fields.push('company_name = ?');
        values.push(company_name);
      }
      // 隐私协议和共识勾选
      if (privacy_agreed) {
        fields.push('privacy_agreed = 1');
      }
      if (consensus_agreed) {
        fields.push('consensus_agreed = 1');
      }
      // 资料完善标记为已完成
      fields.push('profile_completed = 1');
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(phone);

      if (fields.length > 0) {
        await pool.query(
          `UPDATE users SET ${fields.join(', ')} WHERE phone = ?`,
          values
        );
      }

      // 获取更新后的用户
      const [updatedResult]: any = await pool.query(
        'SELECT * FROM users WHERE phone = ?',
        [phone]
      );

      return NextResponse.json({
        success: true,
        user: updatedResult ? updatedResult[0] : null
      });
    }

    // 用户不存在，创建新用户
    const userId = uuidv4();
    await pool.query(
      `INSERT INTO users (id, phone, password, display_name, real_name, user_type, company_name, privacy_agreed, consensus_agreed, profile_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [userId, phone, '', display_name || '用户' + phone.slice(-4), real_name, user_type || 'individual', company_name, privacy_agreed ? 1 : 0, consensus_agreed ? 1 : 0]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        phone,
        display_name: display_name || '用户' + phone.slice(-4),
        real_name,
        user_type: user_type || 'individual',
      }
    });
  } catch (error) {
    console.error('完善资料错误:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
