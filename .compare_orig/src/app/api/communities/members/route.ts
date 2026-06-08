import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 加入/退出社区
export async function POST(request: NextRequest) {
  try {
    const { communityId, userId, userName, action } = await request.json();

    if (!communityId || !userId) {
      return NextResponse.json(
        { success: false, error: '请提供社区ID和用户ID' },
        { status: 400 }
      );
    }

    if (action === 'join') {
      // 加入社区
      
      // 检查社区是否存在
      const [communities] = await pool.query(
        'SELECT * FROM communities WHERE id = ?',
        [communityId]
      ) as any[];

      if (!communities || communities.length === 0) {
        return NextResponse.json(
          { success: false, error: '社区不存在' },
          { status: 404 }
        );
      }

      // 检查是否已加入
      const [existing] = await pool.query(
        'SELECT id FROM community_members WHERE community_id = ? AND user_id = ?',
        [communityId, userId]
      ) as any[];

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { success: false, error: '您已加入此社区' },
          { status: 400 }
        );
      }

      // 检查是否满员
      const community = communities[0];
      if (community.max_members && community.member_count >= community.max_members) {
        return NextResponse.json(
          { success: false, error: '社区已满员' },
          { status: 400 }
        );
      }

      // 创建成员记录
      const id = 'cm-' + Date.now();
      await pool.query(
        `INSERT INTO community_members (id, community_id, user_id, user_name, role) VALUES (?, ?, ?, ?, 'member')`,
        [id, communityId, userId, userName || '']
      );

      // 更新成员数
      await pool.query(
        'UPDATE communities SET member_count = member_count + 1 WHERE id = ?',
        [communityId]
      );

      return NextResponse.json({
        success: true,
        message: '加入成功',
        id,
      });
      
    } else if (action === 'leave') {
      // 退出社区
      
      // 检查是否是创建者
      const [communities] = await pool.query(
        'SELECT owner_id FROM communities WHERE id = ?',
        [communityId]
      ) as any[];

      if (communities && communities[0]?.owner_id === userId) {
        return NextResponse.json(
          { success: false, error: '创建者不能退出社区' },
          { status: 400 }
        );
      }

      // 删除成员记录
      await pool.query(
        'DELETE FROM community_members WHERE community_id = ? AND user_id = ?',
        [communityId, userId]
      );

      // 减少成员数
      await pool.query(
        'UPDATE communities SET member_count = GREATEST(0, member_count - 1) WHERE id = ?',
        [communityId]
      );

      return NextResponse.json({
        success: true,
        message: '已退出社区',
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('社区操作错误:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
