import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取用户名片列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const [result]: any = await pool.query(
      `SELECT id, user_id, type, fields, phone_numbers, is_default, is_public, share_code, created_at, updated_at
       FROM public_profiles
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    // 解析 fields JSON
    const public_profiles = (result || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : (row.fields || []),
      phoneNumbers: typeof row.phone_numbers === 'string' ? JSON.parse(row.phone_numbers) : (row.phone_numbers || []),
      isDefault: row.is_default === 1,
      isPublic: row.is_public === 1,
      shareCode: row.share_code,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      public_profiles
    });
  } catch (error) {
    console.error('获取名片列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取名片列表失败' },
      { status: 500 }
    );
  }
}

// 创建名片
export async function POST(request: NextRequest) {
  try {
    const { userId, type, fields, phoneNumbers, isDefault, isPublic } = await request.json();

    if (!userId || !type) {
      return NextResponse.json(
        { success: false, error: '请提供必填信息' },
        { status: 400 }
      );
    }

    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      await pool.query(
        `UPDATE public_profiles SET is_default = 0 WHERE user_id = ?`,
        [userId]
      );
    }

    const id = uuidv4();
    const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const fieldsJson = JSON.stringify(fields || []);
    const phoneNumbersJson = JSON.stringify(phoneNumbers || []);

    await pool.query(
      `INSERT INTO public_profiles (id, user_id, type, fields, phone_numbers, is_default, is_public, share_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, userId, type, fieldsJson, phoneNumbersJson, isDefault ? 1 : 0, isPublic !== false ? 1 : 0, shareCode]
    );

    return NextResponse.json({
      success: true,
      message: '名片创建成功',
      profile: {
        id,
        userId,
        type,
        fields: fields || [],
        phoneNumbers: phoneNumbers || [],
        isDefault: isDefault || false,
        isPublic: isPublic !== false,
        shareCode,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('创建名片错误:', error);
    return NextResponse.json(
      { success: false, error: '创建名片失败' },
      { status: 500 }
    );
  }
}
