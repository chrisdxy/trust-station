import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取社区列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const industry = searchParams.get('industry') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const userId = searchParams.get('userId') || '';
    let whereConditions: string[] = [];
    const params: any[] = [];

    // 公开可见的（active）或者创建者查看自己的（pending/draft）
    if (userId) {
      whereConditions.push('(c.status = ? OR (c.status IN (?,?) AND c.owner_id = ?))');
      params.push('active', 'pending', 'draft', userId);
    } else {
      whereConditions.push('c.status = ?');
      params.push('active');
    }

    if (category) {
      whereConditions.push(`c.category = ?`);
      params.push(category);
    }
    if (industry) {
      whereConditions.push(`c.industry = ?`);
      params.push(industry);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM communities c WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表 - 转换字段名与前端匹配
    const [result]: any = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.summary,
        c.description,
        c.cover_image as coverImage,
        c.category,
        c.industry,
        c.status,
        c.member_count as members,
        c.member_list,
        c.images,
        c.is_public as isPublic,
        c.is_paid as isPaid,
        c.qr_code as qrCode,
        c.owner_id as ownerId,
        c.created_at as createdAt,
        c.is_pinned as isPinned,
        c.sort_order as sortOrder,
        (SELECT COUNT(*) FROM activities WHERE community_id = c.id) as activityCount,
        u.display_name as ownerName
       FROM communities c
       LEFT JOIN users u ON c.owner_id = u.id
       WHERE ${whereClause}
       ORDER BY c.member_count DESC, c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 转换数据格式 - 从 community_members 表获取真实成员
    const communities = await Promise.all((result || []).map(async (c: any) => {
      let memberList: any[] = [];
      try {
        const [realMembers]: any = await pool.query(
          `SELECT cm.user_name, cm.role, cm.user_id, cm.created_at as joinedAt,
                  u.display_name, u.real_name
           FROM community_members cm
           LEFT JOIN users u ON cm.user_id = u.id
           WHERE cm.community_id = ?`,
          [c.id]
        );
        memberList = (realMembers || []).map((m: any) => ({
          name: m.display_name || m.real_name || m.user_name || ('uid-' + (m.user_id || '')),
          email: 'uid-' + (m.user_id || ''),
          role: m.role || 'member',
          joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString().split('T')[0] : '',
        }));
        // 如果 member_list 为空但有社区成员，回写 JSON
        if (memberList.length > 0 && (!c.member_list || c.member_list === '[]' || c.member_list === 'null')) {
          await pool.query('UPDATE communities SET member_list = ?, member_count = ? WHERE id = ?',
            [JSON.stringify(memberList), memberList.length, c.id]);
        }
      } catch (e) { memberList = []; }
      
      let images: any[] = [];
      try {
        images = c.images ? JSON.parse(c.images) : [];
      } catch (e) { images = []; }
      // 处理日期格式
      let createdAt = '';
      if (c.createdAt) {
        const date = new Date(c.createdAt);
        if (!isNaN(date.getTime())) {
          createdAt = date.toISOString().split('T')[0];
        }
      }
      return {
        id: c.id,
        name: c.name,
        summary: c.summary || '',
        description: c.description || '',
        category: c.category || '',
        industry: c.industry || '',
        industryName: '',
        status: c.status || 'active',
        members: memberList.length,
        memberList,
        images,
        activities: [],
        createdAt,
        isPublic: c.isPublic === 1 || c.isPublic === true,
        isPaid: c.isPaid === 1 || c.isPaid === true,
        coverImage: c.coverImage || '',
        qrCode: c.qrCode || '',
        ownerId: c.ownerId,
        ownerName: c.ownerName,
      };
    }));

    return NextResponse.json({
      success: true,
      communities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('获取社区列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取社区列表失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 创建社区
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('收到创建社区请求:', JSON.stringify(body, null, 2));
    
    const { 
      ownerId, ownerName,
      name,
      summary,
      description, 
      category, 
      industry,
      maxMembers, 
      coverImage, 
      rules,
      isPublic,
      isPaid,
      qrCode,
      images
    } = body;

    console.log('解析后的数据:', { ownerId, name, description: description?.substring(0, 50) });

    if (!ownerId || !name) {
      return NextResponse.json(
        { success: false, error: '请填写必填信息' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const now = new Date();

    // 创建者作为第一个成员
    const memberList = [{
      id: ownerId,
      role: 'creator',
      joinedAt: now.toISOString()
    }];

    await pool.query(
      `INSERT INTO communities (id, name, summary, description, owner_id, category, industry, max_members, cover_image, rules, status, member_count, member_list, images, is_public, is_paid, qr_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        name,
        summary || '',
        description || '', 
        ownerId, 
        category || '', 
        industry || '',
        maxMembers || null, 
        coverImage || '', 
        rules || '',
        JSON.stringify(memberList),
        JSON.stringify(images || []),
        isPublic !== false ? 1 : 0,
        isPaid ? 1 : 0,
        qrCode || '',
        now,
        now
      ]
    );

    // 同步写入 community_members 表（真实成员表）
    await pool.query(
      `INSERT INTO community_members (id, community_id, user_id, user_name, role) VALUES (?, ?, ?, ?, 'creator')`,
      ['cm-' + Date.now(), id, ownerId, ownerName || ownerId]
    );

    return NextResponse.json({
      success: true,
      message: '社区创建成功',
      id,
    });
  } catch (error: any) {
    console.error('创建社区错误:', error);
    return NextResponse.json(
      { success: false, error: '创建失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 更新社区
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少社区ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      name,
      summary,
      description, 
      category, 
      industry,
      coverImage, 
      isPublic,
      isPaid,
      images,
      qrCode,
      memberList
    } = body;

    const now = new Date();

    await pool.query(
      `UPDATE communities SET 
        name = ?,
        summary = ?,
        description = ?, 
        category = ?, 
        industry = ?,
        cover_image = ?, 
        is_public = ?, 
        is_paid = ?, 
        images = ?,
        qr_code = ?,
        member_list = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        name || '',
        summary || '',
        description || '', 
        category || '', 
        industry || '',
        coverImage || '', 
        isPublic !== false ? 1 : 0, 
        isPaid ? 1 : 0, 
        JSON.stringify(images || []),
        qrCode || '',
        JSON.stringify(memberList || []),
        now,
        id
      ]
    );

    return NextResponse.json({
      success: true,
      message: '社区更新成功',
    });
  } catch (error: any) {
    console.error('更新社区错误:', error);
    return NextResponse.json(
      { success: false, error: '更新失败: ' + error.message },
      { status: 500 }
    );
  }
}

// 删除社区
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少社区ID' },
        { status: 400 }
      );
    }

    await pool.query(
      `DELETE FROM communities WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: '社区删除成功',
    });
  } catch (error: any) {
    console.error('删除社区错误:', error);
    return NextResponse.json(
      { success: false, error: '删除失败: ' + error.message },
      { status: 500 }
    );
  }
}
