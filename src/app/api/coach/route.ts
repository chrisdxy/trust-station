import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coach_applications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      name VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(20) DEFAULT NULL,
      email VARCHAR(100) DEFAULT NULL,
      type VARCHAR(50) DEFAULT NULL,
      expertise TEXT DEFAULT NULL,
      description TEXT DEFAULT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET: 获取陪跑专家列表（按用户或状态）
export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const userId = request.nextUrl.searchParams.get('userId');
    const status = request.nextUrl.searchParams.get('status');
    let query = 'SELECT ca.*, u.display_name, u.real_name, u.phone FROM coach_applications ca LEFT JOIN users u ON ca.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    if (userId) { query += ' AND ca.user_id = ?'; params.push(userId); }
    if (status) { query += ' AND ca.status = ?'; params.push(status); }
    query += ' ORDER BY ca.created_at DESC';
    const [rows]: any = await pool.query(query, params);
    // 返回时将 expertise 从 JSON 字符串解析为数组
    const coaches = (rows || []).map((r: any) => ({
      ...r,
      expertise: r.expertise ? (() => { try { return JSON.parse(r.expertise); } catch { return r.expertise; } })() : []
    }));
    return NextResponse.json({ success: true, coaches });
  } catch (error: any) {
    console.error('获取陪跑专家失败:', error?.message);
    return NextResponse.json({ success: false, error: '获取失败' }, { status: 500 });
  }
}

// POST: 创建/更新陪跑专家申请
export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const { userId, name, phone, email, type, expertise, description } = await request.json();
    if (!userId) return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });

    // 将 expertise 数组转为 JSON 字符串存储
    const expertiseStr = Array.isArray(expertise) ? JSON.stringify(expertise) : (expertise || '');

    // 检查是否已有申请
    const [existing]: any = await pool.query(
      'SELECT id FROM coach_applications WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      // 更新已有申请
      await pool.query(
        'UPDATE coach_applications SET name=?, phone=?, email=?, type=?, expertise=?, description=?, status="pending", updated_at=NOW() WHERE user_id=?',
        [name, phone, email, type, expertiseStr, description, userId]
      );
      return NextResponse.json({ success: true, message: '申请已更新' });
    }

    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    await pool.query(
      'INSERT INTO coach_applications (id, user_id, name, phone, email, type, expertise, description) VALUES (?,?,?,?,?,?,?,?)',
      [id, userId, name, phone, email, type, expertiseStr, description]
    );
    return NextResponse.json({ success: true, message: '申请已提交' });
  } catch (error: any) {
    console.error('提交陪跑专家申请失败:', error?.message);
    return NextResponse.json({ success: false, error: '提交失败' }, { status: 500 });
  }
}

// PUT: 审批陪跑专家
export async function PUT(request: NextRequest) {
  try {
    await ensureTable();
    const { id, status } = await request.json();
    await pool.query('UPDATE coach_applications SET status=?, updated_at=NOW() WHERE id=?', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('审批陪跑专家失败:', error?.message);
    return NextResponse.json({ success: false, error: '操作失败' }, { status: 500 });
  }
}

// DELETE: 删除申请
export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: '缺少ID' }, { status: 400 });
    await pool.query('DELETE FROM coach_applications WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除陪跑专家失败:', error?.message);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
