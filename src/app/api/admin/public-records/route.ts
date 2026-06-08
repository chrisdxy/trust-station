import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取公开记录列表（管理后台）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      where += ' AND pr.status = ?';
      params.push(status);
    }

    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM public_records pr ${where}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const [result]: any = await pool.query(
      `SELECT pr.*, 
        COALESCE(a.display_name, a.real_name) as applicant_name,
        COALESCE(p.display_name, p.real_name) as public_person_display_name
       FROM public_records pr
       LEFT JOIN users a ON pr.applicant_id = a.id
       LEFT JOIN users p ON pr.public_person_id = p.id
       ${where}
       ORDER BY pr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      records: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    console.error('获取公开记录列表失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 更新公开记录状态（管理后台：同意/暂停/停止）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少记录ID' }, { status: 400 });
    }

    const validStatuses = ['approved', 'paused', 'stopped'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: '无效的状态值' }, { status: 400 });
    }

    await pool.query(
      'UPDATE public_records SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    const statusLabel: Record<string, string> = {
      approved: '已同意公开',
      paused: '已暂停公开',
      stopped: '已停止公开'
    };

    return NextResponse.json({ success: true, message: statusLabel[status] || '操作成功' });
  } catch (error: any) {
    console.error('更新公开记录失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
