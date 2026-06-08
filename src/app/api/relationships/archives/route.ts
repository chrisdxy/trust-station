import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取某合作事项的历史存档版本列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get('relationshipId');
    const userId = searchParams.get('userId');

    if (!relationshipId) {
      return NextResponse.json(
        { success: false, error: '请提供合作事项ID' },
        { status: 400 }
      );
    }

    // 权限检查：只有相关方才能查看存档
    if (userId) {
      const [relRows]: any = await pool.query(
        'SELECT id FROM relationships WHERE id = ? AND (user_id = ? OR partner_id = ?)',
        [relationshipId, userId, userId]
      );
      if (!relRows || relRows.length === 0) {
        return NextResponse.json(
          { success: false, error: '无权限查看此合作事项的存档' },
          { status: 403 }
        );
      }
    }

    // 获取存档版本列表
    const [archives]: any = await pool.query(
      `SELECT id, relationship_id, version, title, description, goals_and_principles,
              partner_id, partner_name, cooperation_level, status, archived_at, archived_by
       FROM relationship_archives
       WHERE relationship_id = ?
       ORDER BY version DESC`,
      [relationshipId]
    );

    return NextResponse.json({
      success: true,
      archives: archives || []
    });
  } catch (error) {
    console.error('获取存档错误:', error);
    return NextResponse.json(
      { success: false, error: '获取存档失败: ' + (error as any).message },
      { status: 500 }
    );
  }
}
