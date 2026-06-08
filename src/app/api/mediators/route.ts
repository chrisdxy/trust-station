import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取专家列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const status = searchParams.get('status') || '';

    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (userId) { where.push('user_id = ?'); params.push(userId); }
    if (status) { where.push('status = ?'); params.push(status); }

    const [rows] = await pool.query(
      `SELECT * FROM mediator_applications WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params
    ) as any[];

    return NextResponse.json({ success: true, mediators: rows || [] });
  } catch (error) {
    console.error('获取专家列表失败:', error);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// 提交/更新专家申请
export async function POST(request: NextRequest) {
  try {
    const { userId, name, phone, email, type, expertise, description } = await request.json();
    if (!userId || !type) {
      return NextResponse.json({ success: false, error: '缺少必填项' }, { status: 400 });
    }

    // 检查是否已有申请
    const [existing] = await pool.query(
      'SELECT id FROM mediator_applications WHERE user_id = ? LIMIT 1', [userId]
    ) as any[];

    if (existing && existing.length > 0) {
      // 更新
      await pool.query(
        `UPDATE mediator_applications SET name=?, phone=?, email=?, type=?, expertise=?, description=?, status='pending', updated_at=NOW() WHERE user_id=?`,
        [name || '', phone || '', email || '', type, JSON.stringify(expertise || []), description || '', userId]
      );
      return NextResponse.json({ success: true, message: '申请已更新' });
    }

    // 新建
    const id = uuidv4();
    await pool.query(
      `INSERT INTO mediator_applications (id, user_id, name, phone, email, type, expertise, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [id, userId, name || '', phone || '', email || '', type, JSON.stringify(expertise || []), description || '']
    );

    return NextResponse.json({ success: true, message: '申请已提交', id });
  } catch (error) {
    console.error('提交专家申请失败:', error);
    return NextResponse.json({ success: false, error: '提交失败' }, { status: 500 });
  }
}

// 更新专家状态（审批）
export async function PUT(request: NextRequest) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }
    await pool.query('UPDATE mediator_applications SET status=?, updated_at=NOW() WHERE id=?', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新专家状态失败:', error);
    return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
  }
}
