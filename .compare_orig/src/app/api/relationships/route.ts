import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取合作关系列表（权限筛选：只返回相关方可见的记录）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const level = searchParams.get('level') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;
    // 权限筛选：用户是 user_id 或 partner_id 才可见
    const whereConditions: string[] = ['(user_id = ? OR partner_id = ?)'];
    const params: any[] = [userId, userId];

    if (level) {
      whereConditions.push('cooperation_level = ?');
      params.push(level);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM relationships WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT * FROM relationships WHERE ${whereClause} ORDER BY updated_at DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      relationships: result || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取合作关系错误:', error);
    return NextResponse.json(
      { success: false, error: '获取合作关系失败: ' + (error as any).message },
      { status: 500 }
    );
  }
}

// 添加合作关系
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 兼容前端字段名
    const userId = body.userId || body.user_id;
    const title = body.title || '';
    const description = body.description || '';
    const goalsAndPrinciples = body.goals_and_principles || '';
    const partnerId = body.partner_id || body.partnerId || null;
    const partnerName = body.partner_name || body.partnerName || '';
    const type = body.cooperationType || body.type || 'relationship';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '请提供用户ID' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO relationships (id, user_id, title, description, goals_and_principles, partner_id, partner_name, relationship_type, cooperation_level, notes, status, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1)`,
      [id, userId, title, description, goalsAndPrinciples, partnerId, partnerName, type, type, JSON.stringify(body)]
    );

    return NextResponse.json({
      success: true,
      message: '添加成功',
      id,
    });
  } catch (error) {
    console.error('添加合作关系错误:', error);
    return NextResponse.json(
      { success: false, error: '添加失败: ' + (error as any).message },
      { status: 500 }
    );
  }
}

// 更新合作关系（自动存档旧版本）
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供合作事项ID' },
        { status: 400 }
      );
    }

    // 1. 获取当前记录
    const [currentRows]: any = await pool.query(
      'SELECT * FROM relationships WHERE id = ?',
      [id]
    );
    if (!currentRows || currentRows.length === 0) {
      return NextResponse.json(
        { success: false, error: '合作事项不存在' },
        { status: 404 }
      );
    }
    const current = currentRows[0];

    // 2. 权限检查：只有 user_id 或 partner_id 才能编辑
    const userId = body.userId || body.user_id;
    if (userId && current.user_id !== userId && current.partner_id !== userId) {
      return NextResponse.json(
        { success: false, error: '无权限编辑此合作事项' },
        { status: 403 }
      );
    }

    // 3. 自动存档当前版本到 relationship_archives
    const currentVersion = current.version || 1;
    const archiveId = uuidv4();
    await pool.query(
      `INSERT INTO relationship_archives (id, relationship_id, version, title, description, goals_and_principles, partner_id, partner_name, cooperation_level, status, notes, archived_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [archiveId, id, currentVersion, current.title, current.description, current.goals_and_principles, current.partner_id, current.partner_name, current.cooperation_level, current.status, current.notes, userId || null]
    );

    // 4. 更新记录 + version +1
    const fields: string[] = [];
    const values: any[] = [];

    if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
    if (body.goals_and_principles !== undefined) { fields.push('goals_and_principles = ?'); values.push(body.goals_and_principles); }
    if (body.partner_id !== undefined) { fields.push('partner_id = ?'); values.push(body.partner_id); }
    if (body.partner_name !== undefined) { fields.push('partner_name = ?'); values.push(body.partner_name); }
    if (body.cooperation_level !== undefined) { fields.push('cooperation_level = ?'); values.push(body.cooperation_level); }
    if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }

    // version +1
    fields.push('version = ?');
    values.push(currentVersion + 1);

    if (fields.length === 1 && fields[0].startsWith('version')) {
      // 只有 version 字段需要更新（不应发生，但防御性处理）
      return NextResponse.json({ success: true, message: '无实质变更', version: currentVersion });
    }

    values.push(id);
    await pool.query(
      `UPDATE relationships SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({
      success: true,
      message: '更新成功',
      version: currentVersion + 1,
      archivedVersion: currentVersion,
    });
  } catch (error) {
    console.error('更新合作关系错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败: ' + (error as any).message },
      { status: 500 }
    );
  }
}
