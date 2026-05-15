import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取管理员列表
export async function GET() {
  try {
    const [rows]: any = await pool.query(
      'SELECT id, phone, name, email, role, status, created_at, updated_at FROM admins ORDER BY created_at DESC'
    );

    return NextResponse.json({
      success: true,
      admins: rows || [],
    });
  } catch (error: any) {
    console.error('获取管理员列表错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取管理员列表失败' },
      { status: 500 }
    );
  }
}

// 添加管理员
export async function POST(request: NextRequest) {
  try {
    const { phone, password, name, role } = await request.json();

    if (!phone || !password || !name) {
      return NextResponse.json(
        { success: false, error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 检查手机号是否已存在
    const [existing]: any = await pool.query(
      'SELECT id FROM admins WHERE phone = ?',
      [phone]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '该手机号已存在' },
        { status: 400 }
      );
    }

    const id = require('crypto').randomUUID();
    await pool.query(
      `INSERT INTO admins (id, phone, password, name, role) VALUES (?, ?, ?, ?, ?)`,
      [id, phone, password, name, role || 'admin']
    );

    return NextResponse.json({
      success: true,
      message: '管理员添加成功',
      id,
    });
  } catch (error: any) {
    console.error('添加管理员错误:', error.message);
    return NextResponse.json(
      { success: false, error: '添加管理员失败' },
      { status: 500 }
    );
  }
}

// 删除管理员
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供管理员ID' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM admins WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: '管理员删除成功',
    });
  } catch (error: any) {
    console.error('删除管理员错误:', error.message);
    return NextResponse.json(
      { success: false, error: '删除管理员失败' },
      { status: 500 }
    );
  }
}
