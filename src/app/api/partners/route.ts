import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 提交合伙人申请
export async function POST(request: NextRequest) {
  try {
    const { userId, level, region, businessPlan } = await request.json();

    if (!userId || !level) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 获取用户信息
    const [userResult]: any = await pool.query(
      'SELECT display_name, phone FROM users WHERE id = ?',
      [userId]
    );
    const user = userResult?.[0];

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 400 }
      );
    }

    // 检查是否有待处理的申请
    const [existing]: any = await pool.query(
      'SELECT id FROM partner_applications WHERE user_id = ? AND status = ?',
      [userId, 'pending']
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '您已有待处理的申请' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO partner_applications (id, user_id, user_name, user_phone, level, region, business_plan, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, user.display_name || '', user.phone || '', level, region || null, businessPlan || null]
    );

    return NextResponse.json({
      success: true,
      message: '申请提交成功',
      id,
    });
  } catch (error) {
    console.error('提交合伙人申请错误:', error);
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    );
  }
}

// 获取我的合伙人申请状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    const [result]: any = await pool.query(
      `SELECT * FROM partner_applications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      application: result?.[0] || null,
    });
  } catch (error) {
    console.error('获取合伙人申请错误:', error);
    return NextResponse.json(
      { success: false, error: '获取申请失败' },
      { status: 500 }
    );
  }
}
