import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 确保表存在
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_knowledge (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL COMMENT '知识标题',
      content TEXT NOT NULL COMMENT '知识内容',
      tags VARCHAR(500) DEFAULT NULL COMMENT '标签（逗号分隔）',
      category VARCHAR(100) DEFAULT NULL COMMENT '分类',
      enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用',
      sort_order INT DEFAULT 0 COMMENT '排序',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_enabled (enabled),
      INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 小助手知识库'
  `);
}

// GET: 获取知识库列表（支持分页、搜索）
export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const enabled = searchParams.get('enabled');

    const offset = (page - 1) * pageSize;
    const where: string[] = [];
    const params: any[] = [];

    if (keyword) {
      where.push('(title LIKE ? OR content LIKE ? OR tags LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (enabled === '1' || enabled === '0') {
      where.push('enabled = ?');
      params.push(parseInt(enabled));
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // 查总数
    const [countRows]: any = await pool.query(
      `SELECT COUNT(*) as total FROM ai_knowledge ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // 查列表
    const [rows]: any = await pool.query(
      `SELECT * FROM ai_knowledge ${whereClause} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // 获取所有分类
    const [catRows]: any = await pool.query(
      `SELECT DISTINCT category FROM ai_knowledge WHERE category IS NOT NULL AND category != '' ORDER BY category ASC`
    );
    const categories = catRows.map((r: any) => r.category);

    return NextResponse.json({ success: true, data: rows, total, page, pageSize, categories });
  } catch (error: any) {
    console.error('获取AI知识库失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 创建知识条目
export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    const body = await request.json();
    const { title, content, tags, category, sort_order } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: '标题和内容不能为空' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      `INSERT INTO ai_knowledge (title, content, tags, category, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [title.trim(), content.trim(), tags || null, category || null, sort_order || 0]
    );

    return NextResponse.json({
      success: true,
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error: any) {
    console.error('创建知识条目失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: 更新知识条目
export async function PUT(request: NextRequest) {
  try {
    await ensureTable();
    const body = await request.json();
    const { id, title, content, tags, category, enabled, sort_order } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少ID' }, { status: 400 });
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title.trim()); }
    if (content !== undefined) { fields.push('content = ?'); params.push(content.trim()); }
    if (tags !== undefined) { fields.push('tags = ?'); params.push(tags || null); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category || null); }
    if (enabled !== undefined) { fields.push('enabled = ?'); params.push(enabled); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: '没有需要更新的字段' }, { status: 400 });
    }

    params.push(id);
    await pool.query(
      `UPDATE ai_knowledge SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    console.error('更新知识条目失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: 删除知识条目
export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少ID' }, { status: 400 });
    }

    await pool.query('DELETE FROM ai_knowledge WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('删除知识条目失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
