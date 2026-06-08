import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取用户资料
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const phone = searchParams.get('phone');

    if (!userId && !phone) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID或手机号' },
        { status: 400 }
      );
    }

    let query = `SELECT id, phone, display_name, real_name, user_type, 
                      company_name, identity_verified, avatar_url, created_at
                 FROM users WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND id = ?`;
      params.push(userId);
    } else if (phone) {
      query += ` AND phone = ?`;
      params.push(phone);
    }

    const [result]: any = await pool.query(query, params);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: result[0]
    });
  } catch (error) {
    console.error('获取资料错误:', error);
    return NextResponse.json(
      { success: false, error: '获取资料失败' },
      { status: 500 }
    );
  }
}

// 更新用户资料
export async function PUT(request: NextRequest) {
  try {
    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    // 构建更新字段
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.display_name !== undefined) {
      fields.push(`display_name = $${paramIndex}`);
      values.push(updates.display_name);
      paramIndex++;
    }
    if (updates.real_name !== undefined) {
      fields.push(`real_name = $${paramIndex}`);
      values.push(updates.real_name);
      paramIndex++;
    }
    if (updates.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramIndex}`);
      values.push(updates.avatar_url);
      paramIndex++;
    }
    if (updates.company_name !== undefined) {
      fields.push(`company_name = $${paramIndex}`);
      values.push(updates.company_name);
      paramIndex++;
    }
    if (updates.user_type !== undefined) {
      fields.push(`user_type = $${paramIndex}`);
      values.push(updates.user_type);
      paramIndex++;
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新资料错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
