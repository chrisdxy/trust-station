import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const rawType = searchParams.get('userType') || '';
    const status = searchParams.get('status') || '';

    // 映射前端类型到DB值
    let dbType = rawType;
    if (rawType === 'user') dbType = 'individual';
    if (rawType === 'all') dbType = ''; // 全体用户：不过滤类型

    const offset = (page - 1) * limit;
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (search) {
      where.push('(display_name LIKE ? OR real_name LIKE ? OR phone LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (dbType) {
      if (dbType === 'coordinator') {
        where.push('id COLLATE utf8mb4_general_ci IN (SELECT user_id FROM mediator_applications)');
      } else if (dbType === 'partner') {
        where.push('(user_type = ? OR id COLLATE utf8mb4_general_ci IN (SELECT user_id FROM partner_applications))');
        params.push('partner');
      } else {
        where.push('user_type = ?');
        params.push(dbType);
      }
    }
    if (status) {
      if (dbType === 'coordinator') {
        where[where.length - 1] = 'id COLLATE utf8mb4_general_ci IN (SELECT user_id FROM mediator_applications WHERE status = ?)';
      } else if (dbType === 'partner') {
        where[where.length - 1] = 'id COLLATE utf8mb4_general_ci IN (SELECT user_id FROM partner_applications WHERE status = ?)';
      }
      params.push(status);
    }

    const [countRows]: any = await pool.query(`SELECT COUNT(*) as total FROM users WHERE ${where.join(' AND ')}`, params);
    const total = countRows[0]?.total || 0;

    const [rows]: any = await pool.query(
      `SELECT id, display_name, real_name, phone, email, user_type, identity_verified, id_number, created_at, updated_at FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      users: rows || [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    console.error('获取用户列表失败:', error.message);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, updates, appType } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
    const sets: string[] = [];
    const values: any[] = [];
    if (updates?.user_type) { sets.push('user_type = ?'); values.push(updates.user_type); }
    if (updates?.phone) { sets.push('phone = ?'); values.push(updates.phone); }
    if (updates?.email) { sets.push('email = ?'); values.push(updates.email); }
    if (sets.length === 0) return NextResponse.json({ success: false, error: '无变更' }, { status: 400 });
    values.push(userId);
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, values);

    // 同步更新申请表状态
    if (appType === 'coordinator' && updates?.user_type) {
      await pool.query('UPDATE mediator_applications SET status = ? WHERE user_id = ? AND status = ?', ['approved', userId, 'pending']);
    } else if (appType === 'coach' && updates?.user_type) {
      await pool.query('UPDATE coach_applications SET status = ? WHERE user_id = ? AND status = ?', ['approved', userId, 'pending']);
    } else if (appType === 'partner' && updates?.user_type) {
      await pool.query('UPDATE partner_applications SET status = ? WHERE user_id = ? AND status = ?', ['approved', userId, 'pending']);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新用户失败:', error.message);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ success: false, error: '缺少 userId' }, { status: 400 });
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除用户失败:', error.message);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
