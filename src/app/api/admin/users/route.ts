import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取所有用户列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const userType = searchParams.get('userType') || '';
    const status = searchParams.get('status') || 'all';

    const offset = (page - 1) * limit;
    const params: any[] = [];
    let whereConditions = '1=1';

    if (search) {
      whereConditions += ' AND (phone LIKE ? OR display_name LIKE ? OR real_name LIKE ? OR company_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (userType) {
      whereConditions += ' AND user_type = ?';
      params.push(userType);
    }
    
    // 状态筛选（用于协调专家和合伙人）
    if (status === 'pending') {
      whereConditions += ' AND user_type = ?';
      params.push('pending');
    } else if (status === 'approved') {
      whereConditions += ' AND user_type IN (?, ?)';
      params.push('coordinator', 'partner');
    } else if (status === 'rejected') {
      whereConditions += ' AND user_type = ?';
      params.push('rejected');
    }

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereConditions}`,
      params
    );
    const total = countResult?.[0]?.total || 0;

    // 获取用户列表
    const [usersResult]: any = await pool.query(
      `SELECT id, phone, display_name, real_name, user_type, company_name, 
              identity_verified, avatar_url, created_at, updated_at
       FROM users 
       WHERE ${whereConditions}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      users: usersResult || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('获取用户列表错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取用户列表失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 更新用户状态
export async function PUT(request: NextRequest) {
  try {
    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.identity_verified !== undefined) {
      fields.push('identity_verified = ?');
      values.push(updates.identity_verified);
    }
    if (updates.user_type !== undefined) {
      fields.push('user_type = ?');
      values.push(updates.user_type);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.display_name !== undefined) {
      fields.push('display_name = ?');
      values.push(updates.display_name);
    }
    if (updates.permissions !== undefined) {
      fields.push('permissions = ?');
      values.push(JSON.stringify(updates.permissions));
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有需要更新的字段' },
        { status: 400 }
      );
    }

    fields.push('updated_at = NOW()');
    values.push(userId);

    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '用户状态更新成功',
    });
  } catch (error: any) {
    console.error('更新用户状态错误:', error.message);
    return NextResponse.json(
      { success: false, error: '更新用户状态失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '用户删除成功',
    });
  } catch (error: any) {
    console.error('删除用户错误:', error.message);
    return NextResponse.json(
      { success: false, error: '删除用户失败: ' + error.message },
      { status: 500 }
    );
  }
}
