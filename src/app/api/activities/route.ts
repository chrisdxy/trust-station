import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 获取活动列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const offset = (page - 1) * limit;
    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (status) {
      whereConditions.push('a.status = ?');
      params.push(status);
    }
    if (type) {
      whereConditions.push('a.activity_type = ?');
      params.push(type);
    }

    const userId = searchParams.get('userId');
    const organized = searchParams.get('organized') === 'true';
    const joined = searchParams.get('joined') === 'true';

    // 我组织的：我发布的 OR 我作为组织成员的活动
    if (organized && userId) {
      whereConditions.push('(a.user_id = ? OR a.organizer_id = ?)');
      params.push(userId, userId);
    }
    // 我报名的：我报名且状态为 registered 的活动
    if (joined && userId) {
      whereConditions.push('ap.user_id = ? AND ap.status = "registered"');
      params.push(userId);
    }
    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult]: any = await pool.query(
      `SELECT COUNT(*) as total FROM activities a
       LEFT JOIN activity_participants ap ON a.id = ap.activity_id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.[0]?.total || '0');

    // 获取列表
    const [result]: any = await pool.query(
      `SELECT a.*, u.display_name as organizer_name, ou.display_name as organizer_name_selected,
              ap.status as my_registration_status,
              (a.organizer_id IS NOT NULL AND a.organizer_id != '' AND a.organizer_id = ?) as is_organizer_member
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN users ou ON a.organizer_id = ou.id
       LEFT JOIN activity_participants ap ON a.id = ap.activity_id AND ap.user_id = ?
       WHERE ${whereClause}
       ORDER BY a.start_time DESC
       LIMIT ? OFFSET ?`,
      [userId, userId, ...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      activities: result || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取活动列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取活动列表失败' },
      { status: 500 }
    );
  }
}

// 创建活动
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 兼容前端 snake_case 和 camelCase 字段名
    const userId = body.userId || body.user_id;
    const title = body.title;
    const description = body.description;
    const location = body.location;
    const startTimeRaw = body.start_time || body.startTime || null;
    // 将 datetime-local 格式 (2026-05-15T20:30) 转为 MySQL DATETIME 格式
    let startTime: string | null = null;
    if (startTimeRaw) {
      const d = new Date(startTimeRaw);
      if (!isNaN(d.getTime())) {
        startTime = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
    const maxParticipants = body.max_participants || body.maxParticipants;
    // 前端可传 organizer_ids 数组（取第一个）或单个 organizerId
    const organizerIds: string[] = body.organizer_ids || (body.organizerId ? [body.organizerId] : []);
    const organizerId = organizerIds.length > 0 ? organizerIds[0] : null;

    console.log('[活动创建] 收到请求:', { userId, title, description: description?.slice?.(0, 50), location, startTime, maxParticipants, organizerId });

    if (!userId || !title) {
      console.warn('[活动创建] 缺少必填字段:', { userId, title });
      return NextResponse.json(
        { success: false, error: '请填写必填信息（标题）' },
        { status: 400 }
      );
    }

    const id = uuidv4();
    console.log('[活动创建] 执行 INSERT, id:', id);
    await pool.query(
      `INSERT INTO activities (id, user_id, title, description, location, start_time, max_participants, organizer_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')`,
      [id, userId, title, description || '', location || '', startTime, maxParticipants || null, organizerId]
    );
    console.log('[活动创建] INSERT 成功, id:', id);

    return NextResponse.json({
      success: true,
      message: '活动创建成功',
      id,
    });
  } catch (error: any) {
    console.error('[活动创建] 错误:', error?.message || error?.code || error, error);
    return NextResponse.json(
      { success: false, error: '创建失败: ' + (error?.message || error?.code || '未知错误') },
      { status: 500 }
    );
  }
}
