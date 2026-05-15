import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取 AI 工具列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const enabledOnly = searchParams.get('enabled') === 'true';

    let query = 'SELECT * FROM ai_tools WHERE 1=1';
    const params: string[] = [];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    if (enabledOnly) {
      query += ' AND enabled = 1';
    }

    query += ' ORDER BY created_at DESC';

    const [result]: any = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      tools: result || [],
    });
  } catch (error) {
    console.error('获取AI工具列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 创建/更新 AI 工具
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, name, description, url, icon, category, sortOrder, enabled, toolStatus } = body;

    // 处理审批操作
    if (action === 'approve' && id) {
      await pool.query(
        `UPDATE ai_tools SET status = 'approved', enabled = 1, updated_at = NOW() WHERE id = ?`,
        [id]
      );
      return NextResponse.json({ success: true, message: '已批准' });
    }

    if (action === 'reject' && id) {
      await pool.query(
        `UPDATE ai_tools SET status = 'rejected', enabled = 0, updated_at = NOW() WHERE id = ?`,
        [id]
      );
      return NextResponse.json({ success: true, message: '已拒绝' });
    }

    // 保存工具信息
    if (!name) {
      return NextResponse.json(
        { success: false, error: '请提供工具名称' },
        { status: 400 }
      );
    }

    if (id) {
      // 更新
      await pool.query(
        `UPDATE ai_tools SET name = ?, description = ?, url = ?, icon = ?, category = ?, sort_order = ?, enabled = ?, updated_at = NOW() WHERE id = ?`,
        [name, description || '', url || '', icon || '', category || '', sortOrder || 0, enabled !== false ? 1 : 0, id]
      );
    } else {
      // 创建（提交申请）
      await pool.query(
        `INSERT INTO ai_tools (name, description, url, icon, category, sort_order, status, enabled) VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
        [name, description || '', url || '', icon || '', category || '', sortOrder || 0]
      );
    }

    return NextResponse.json({
      success: true,
      message: '提交成功，请等待审核',
    });
  } catch (error) {
    console.error('保存AI工具错误:', error);
    return NextResponse.json(
      { success: false, error: '保存失败' },
      { status: 500 }
    );
  }
}

// 删除 AI 工具
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供工具ID' },
        { status: 400 }
      );
    }

    const [result]: any = await pool.query(
      'DELETE FROM ai_tools WHERE id = ?',
      [id]
    );

    if (!result || result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: '工具不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    console.error('删除AI工具错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败' },
      { status: 500 }
    );
  }
}
