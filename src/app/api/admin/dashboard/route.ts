import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // 并行查询统计数据
    const [[{ userCount }]]: any = await pool.query('SELECT COUNT(*) as userCount FROM users');
    const [[{ relationCount }]]: any = await pool.query('SELECT COUNT(*) as relationCount FROM relationships');
    const [[{ pendingMediation }]]: any = await pool.query("SELECT COUNT(*) as pendingMediation FROM mediations WHERE status = 'pending'");
    const [[{ newUsers }]]: any = await pool.query('SELECT COUNT(*) as newUsers FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    const [[{ pendingCommunity }]]: any = await pool.query("SELECT COUNT(*) as pendingCommunity FROM communities WHERE status = 'pending'");
    const [[{ pendingFeedback }]]: any = await pool.query("SELECT COUNT(*) as pendingFeedback FROM feedbacks WHERE status = 'pending'");
    const [[{ ongoingMediation }]]: any = await pool.query("SELECT COUNT(*) as ongoingMediation FROM mediations WHERE status IN ('pending','ongoing')");

    // 最近活动：最近注册的5个用户
    const [recentUsers]: any = await pool.query(
      'SELECT display_name, real_name, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );

    // 最近活动：最近5条合作关系
    const [recentRelations]: any = await pool.query(
      'SELECT id, created_at FROM relationships ORDER BY created_at DESC LIMIT 5'
    );

    // 上月用户数（用于计算增长率）
    const [[{ lastMonthUsers }]]: any = await pool.query(
      'SELECT COUNT(*) as lastMonthUsers FROM users WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );

    const growthRate = lastMonthUsers > 0 
      ? Math.round((newUsers / lastMonthUsers) * 100) 
      : 100;

    // 构建最近动态列表
    const activities: { type: string; text: string; time: string }[] = [];

    for (const u of recentUsers) {
      const name = u.real_name || u.display_name || '用户';
      const timeAgo = timeSince(new Date(u.created_at));
      activities.push({ type: 'user', text: `新用户注册：${name}`, time: timeAgo });
    }

    return NextResponse.json({
      success: true,
      stats: {
        userCount: userCount || 0,
        relationCount: relationCount || 0,
        ongoingMediation: ongoingMediation || 0,
        newUsers: newUsers || 0,
        growthRate: `+${growthRate}%`
      },
      pending: {
        mediation: pendingMediation || 0,
        community: pendingCommunity || 0,
        feedback: pendingFeedback || 0
      },
      activities: activities.slice(0, 10)
    });
  } catch (error: any) {
    console.error('获取仪表盘数据失败:', error?.message || error);
    return NextResponse.json({ success: false, error: '获取数据失败' }, { status: 500 });
  }
}

function timeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}月前`;
}
