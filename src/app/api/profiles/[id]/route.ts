import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取单个名片
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [result]: any = await pool.query(
      `SELECT id, user_id, type, fields, phone_numbers, is_default, is_public, share_code, created_at, updated_at
       FROM public_profiles
       WHERE id = ?`,
      [id]
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { success: false, error: '名片不存在' },
        { status: 404 }
      );
    }

    const row = result[0];
    return NextResponse.json({
      success: true,
      profile: {
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
      }
    });
  } catch (error) {
    console.error('获取名片详情错误:', error);
    return NextResponse.json(
      { success: false, error: '获取名片详情失败' },
      { status: 500 }
    );
  }
}

// 更新名片
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { type, fields, phoneNumbers, isDefault, isPublic } = await request.json();

    // 如果设置为默认，先取消其他默认
    if (isDefault) {
      const [current]: any = await pool.query(
        `SELECT user_id FROM public_profiles WHERE id = ?`,
        [id]
      );
      if (current && current.length > 0) {
        await pool.query(
          `UPDATE public_profiles SET is_default = 0 WHERE user_id = ? AND id != ?`,
          [current[0].user_id, id]
        );
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }
    if (fields !== undefined) {
      updates.push('fields = ?');
      values.push(JSON.stringify(fields));
    }
    if (phoneNumbers !== undefined) {
      updates.push('phone_numbers = ?');
      values.push(JSON.stringify(phoneNumbers));
    }
    if (isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(isDefault ? 1 : 0);
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      values.push(isPublic ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await pool.query(
      `UPDATE public_profiles SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '名片更新成功'
    });
  } catch (error) {
    console.error('更新名片错误:', error);
    return NextResponse.json(
      { success: false, error: '更新名片失败' },
      { status: 500 }
    );
  }
}

// 删除名片
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await pool.query(
      `DELETE FROM public_profiles WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '名片删除成功'
    });
  } catch (error) {
    console.error('删除名片错误:', error);
    return NextResponse.json(
      { success: false, error: '删除名片失败' },
      { status: 500 }
    );
  }
}
