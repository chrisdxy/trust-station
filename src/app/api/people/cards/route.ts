import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取已创建名片的用户列表（仅返回 is_public=1 的名片）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // personal / expert / partner / enterprise
    const types = searchParams.get('types'); // comma-separated: "expert,coach"
    const excludeId = searchParams.get('excludeId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT
        pp.id AS card_id,
        pp.type AS card_type,
        pp.fields AS card_fields,
        pp.is_public,
        u.id,
        u.display_name,
        u.real_name,
        u.user_type,
        u.company_name,
        u.avatar_url,
        u.location,
        u.identity_verified,
        u.created_at
      FROM public_profiles pp
      INNER JOIN users u ON pp.user_id = u.id OR u.id = CONCAT('UID', pp.user_id)
      WHERE pp.is_public = 1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (excludeId) {
      sql += ` AND u.id != ?`;
      params.push(excludeId);
      paramIndex++;
    }

    if (type) {
      sql += ` AND pp.type = ?`;
      params.push(type);
      paramIndex++;
    }

    if (types) {
      const typeList = types.split(',').map(t => t.trim()).filter(Boolean);
      if (typeList.length > 0) {
        sql += ` AND pp.type IN (${typeList.map(() => '?').join(',')})`;
        params.push(...typeList);
        paramIndex += typeList.length;
      }
    }

    if (search) {
      sql += ` AND (
        u.display_name LIKE ? OR
        u.real_name LIKE ? OR
        u.company_name LIKE ? OR
        pp.fields LIKE ?
      )`;
      const likeSearch = `%${search}%`;
      params.push(likeSearch, likeSearch, likeSearch, likeSearch);
      paramIndex += 4;
    }

    sql += ` ORDER BY pp.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [result]: any = await pool.query(sql, params);

    // 解析 fields JSON，组装展示数据
    const cards = (result || []).map((row: any) => {
      let cardFields = {};
      try {
        cardFields = typeof row.card_fields === 'string' ? JSON.parse(row.card_fields) : (row.card_fields || {});
        // fields 可能是数组格式 [{key, label, value}] 或对象格式 {key: value}
        if (Array.isArray(cardFields)) {
          const obj: Record<string, string> = {};
          cardFields.forEach((f: any) => {
            obj[f.key || f.label] = f.value || '';
          });
          cardFields = obj;
        }
      } catch (e) {
        cardFields = {};
      }

      return {
        cardId: row.card_id,
        cardType: row.card_type,
        id: row.id,
        display_name: row.display_name,
        real_name: row.real_name,
        user_type: row.user_type,
        company_name: row.company_name,
        avatar_url: row.avatar_url,
        location: row.location,
        identity_verified: row.identity_verified,
        created_at: row.created_at,
        // 名片字段数据
        bio: (cardFields as any).bio || (cardFields as any).description || '',
        expertise: (cardFields as any).expertise || (cardFields as any).field || '',
        title: (cardFields as any).title || '',
        email: (cardFields as any).email || '',
        wechat: (cardFields as any).wechat || '',
        cooperation: (cardFields as any).cooperation || '',
        industry: (cardFields as any).industry || '',
        experience: (cardFields as any).experience || '',
        education: (cardFields as any).education || '',
        address: (cardFields as any).address || '',
        cardFields,
      };
    });

    return NextResponse.json({ success: true, cards });
  } catch (error: any) {
    console.error('获取名片列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
