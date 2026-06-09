import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取项目列表或单个项目详情
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    
    // 单个项目详情
    if (id) {
      const [projects] = await pool.query(
        `SELECT p.*, u.display_name as creator_name
         FROM projects p LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [id]
      ) as any[];
      if (!projects || projects.length === 0) {
        return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
      }
      const p = projects[0];
      let images: string[] = [];
      try { images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); } catch { images = []; }
      return NextResponse.json({
        success: true,
        project: {
          id: p.id,
          title: p.title || p.name || '',
          status: p.status || 'draft',
          location: p.location || '',
          industry: p.industry || '',
          types: (() => { try { const t = typeof p.types === 'string' ? JSON.parse(p.types) : (p.types || []); return Array.isArray(t) ? t : []; } catch { return []; } })(),
          description: p.description || '',
          images: Array.isArray(images) ? images : [],
          date: p.date || '',
          createdAt: p.created_at || null,
          members: (() => { try { const m = typeof p.members === 'string' ? JSON.parse(p.members) : (p.members || []); return Array.isArray(m) ? m : []; } catch { return []; } })(),
          creatorId: p.user_id,
          paused: p.paused === 1 || p.paused === true,
          coverImage: Array.isArray(images) && images.length > 0 ? images[0] : ''
        }
      });
    }
    
    // 项目列表
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const userId = searchParams.get('userId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (status) {
      whereConditions.push(`p.status = ?`);
      params.push(status);
    }
    if (type) {
      whereConditions.push(`p.types LIKE ?`);
      params.push(`%${type}%`);
    }
    if (userId) {
      whereConditions.push(`p.user_id = ?`);
      params.push(userId);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM projects p WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT p.*, COALESCE(u.display_name, u.real_name, u.nickname, u.phone) as creator_name
       FROM projects p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 字段映射：数据库字段 → 前端接口
    const projects = (result || []).map((p: any) => {
      let images: string[] = [];
      try { images = typeof p.images === 'string' ? JSON.parse(p.images) : (p.images || []); } catch { images = []; }
      let members: string[] = [];
      try { members = typeof p.members === 'string' ? JSON.parse(p.members) : (p.members || []); } catch { members = []; }
      let types: string[] = [];
      try { types = typeof p.types === 'string' ? JSON.parse(p.types) : (p.types || []); } catch { types = []; }

      return {
        id: p.id,
        title: p.title || p.name || '',
        status: p.status || 'draft',
        location: p.location || '',
        industry: p.industry || '',
        types: Array.isArray(types) ? types : (types ? [types] : []),
        description: p.description || '',
        summary: p.summary || (p.description || '').replace(/<[^>]*>/g, '').trim().slice(0, 200),
        images: Array.isArray(images) ? images : [],
        date: p.date || '',
        createdAt: p.created_at || null,
        members: Array.isArray(members) ? members : [],
        creatorId: p.user_id,
        creatorName: p.creator_name || '',
        paused: p.paused === 1 || p.paused === true,
        coverImage: Array.isArray(images) && images.length > 0 ? images[0] : '',
        qr_code: p.qr_code || ''
      };
    });

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}

// 创建项目
export async function POST(request: NextRequest) {
  try {
    const { userId, title, description, summary, coverImage, qrCode, projectTypes, industry, location } = await request.json();

    if (!userId || !title) {
      return NextResponse.json(
        { success: false, error: '请填写必填信息' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    // 数据库表字段: id, user_id, title, name, description, location, industry, types, images, status
    await pool.query(
      `INSERT INTO projects (id, user_id, title, name, description, summary, location, industry, types, images, qr_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [id, userId, title, title, description || '', summary || '', location || '', industry || '',
       JSON.stringify(Array.isArray(projectTypes) ? projectTypes : (projectTypes ? [projectTypes] : [])),
       JSON.stringify([coverImage].filter(Boolean)),
       qrCode || null]
    );

    return NextResponse.json({
      success: true,
      message: '项目创建成功',
      id
    });
  } catch (error) {
    console.error('创建项目错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败: ' + (error as any).message },
      { status: 500 }
    );
  }
}

// 更新项目
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    if (!id) {
      return NextResponse.json(
        { success: false, error: '请提供项目ID' },
        { status: 400 }
      );
    }

    const { title, description, summary, coverImage, images, qrCode, projectTypes, industry, location } = await request.json();

    const fields: string[] = [];
    const values: any[] = [];

    if (title) { fields.push('title = ?'); fields.push('name = ?'); values.push(title, title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (summary !== undefined) { fields.push('summary = ?'); values.push(summary); }
    if (images !== undefined) { fields.push('images = ?'); values.push(JSON.stringify(Array.isArray(images) ? images : [])); }
    else if (coverImage !== undefined) {
      // 仅更新封面图时，保留现有 images 并替换第一张
      const [rows] = await pool.query('SELECT images FROM projects WHERE id = ?', [id]) as any[];
      let existingImages: string[] = [];
      try { existingImages = typeof rows?.[0]?.images === 'string' ? JSON.parse(rows[0].images) : (rows[0]?.images || []); } catch { existingImages = []; }
      if (coverImage) {
        existingImages[0] = coverImage;
      } else {
        existingImages = existingImages.slice(1);
      }
      fields.push('images = ?'); values.push(JSON.stringify(existingImages.filter(Boolean)));
    }
    if (qrCode !== undefined) { fields.push('qr_code = ?'); values.push(qrCode); }
    if (projectTypes !== undefined) { fields.push('types = ?'); values.push(JSON.stringify(Array.isArray(projectTypes) ? projectTypes : (projectTypes ? [projectTypes] : []))); }
    if (industry !== undefined) { fields.push('industry = ?'); values.push(industry); }
    if (location !== undefined) { fields.push('location = ?'); values.push(location); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: '没有要更新的字段' }, { status: 400 });
    }

    values.push(id);
    await pool.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新项目错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    if (!id) {
      return NextResponse.json({ success: false, error: '请提供项目ID' }, { status: 400 });
    }

    await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: '项目已删除' });
  } catch (error) {
    console.error('删除项目错误:', error);
    return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
  }
}
