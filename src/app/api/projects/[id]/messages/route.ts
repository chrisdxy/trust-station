import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 确保表存在
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id VARCHAR(36) NOT NULL,
      sender_id VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      is_from_creator TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_project (project_id),
      INDEX idx_sender (sender_id),
      INDEX idx_project_sender (project_id, sender_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // 确保 notifications 表存在
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'system',
      title VARCHAR(255) NOT NULL DEFAULT '',
      content TEXT,
      reference_id VARCHAR(100) DEFAULT NULL,
      reference_name VARCHAR(255) DEFAULT NULL,
      actor_id VARCHAR(100) DEFAULT NULL,
      actor_name VARCHAR(100) DEFAULT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_user_read (user_id, is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET: 获取沟通消息
// 创建者看到所有对话（按发送者分组）
// 非创建者只看到自己和创建者的消息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTable();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const projectUserId = searchParams.get('projectUserId'); // 项目创建者ID

    if (!userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    // 判断当前用户是否是项目创建者
    const isCreator = projectUserId && userId === projectUserId;

    if (isCreator) {
      // 创建者：获取所有发送者的最新消息列表（按发送者分组）
      const [rows]: any = await pool.query(
        `SELECT pm.*, u.display_name as sender_name
         FROM project_messages pm
         LEFT JOIN users u ON pm.sender_id = u.id
         WHERE pm.project_id = ?
         ORDER BY pm.created_at ASC`,
        [id]
      );

      // 按发送者分组
      const conversations: Record<string, any[]> = {};
      for (const msg of rows) {
        if (!conversations[msg.sender_id]) {
          conversations[msg.sender_id] = [];
        }
        conversations[msg.sender_id].push(msg);
      }

      // 转换为列表，包含未读计数
      const conversationList = Object.entries(conversations).map(([senderId, msgs]) => ({
        senderId,
        senderName: msgs[0]?.sender_name || '用户',
        totalCount: msgs.length,
        lastMessage: msgs[msgs.length - 1],
        lastTime: msgs[msgs.length - 1]?.created_at,
      }));

      // 按最后消息时间降序排列
      conversationList.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());

      return NextResponse.json({ success: true, isCreator: true, conversations: conversationList, messages: rows });
    } else {
      // 非创建者：只获取自己和创建者的消息
      const [rows]: any = await pool.query(
        `SELECT pm.*, u.display_name as sender_name
         FROM project_messages pm
         LEFT JOIN users u ON pm.sender_id = u.id
         WHERE pm.project_id = ? AND pm.sender_id = ?
         ORDER BY pm.created_at ASC`,
        [id, userId]
      );

      return NextResponse.json({ success: true, isCreator: false, messages: rows });
    }
  } catch (error: any) {
    console.error('获取项目消息失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 发送消息
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTable();
    const { id } = await params;
    const { userId, content, creatorId, senderName } = await request.json();

    if (!userId || !content) {
      return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });
    }

    // 判断发送者是否是创建者
    const isFromCreator = creatorId && userId === creatorId;

    // 插入消息
    await pool.query(
      `INSERT INTO project_messages (project_id, sender_id, content, is_from_creator) VALUES (?, ?, ?, ?)`,
      [id, userId, content.trim(), isFromCreator ? 1 : 0]
    );

    // 如果是非创建者发送消息，通知创建者
    if (!isFromCreator && creatorId && creatorId !== userId) {
      // 获取项目标题
      const [projRows]: any = await pool.query(
        'SELECT title FROM projects WHERE id = ?', [id]
      );
      const projectTitle = projRows[0]?.title || '项目';

      try {
        const notifId = uuidv4();
        const messagePreview = content.trim().substring(0, 100);
        const displayName = senderName || '用户';

        await pool.query(
          `INSERT INTO notifications (id, user_id, type, title, content, reference_id, reference_name, actor_id, actor_name)
           VALUES (?, ?, 'project_message', ?, ?, ?, ?, ?, ?)`,
          [
            notifId,
            creatorId,
            `【${projectTitle}】${displayName} 发来消息`,
            messagePreview,
            id,
            projectTitle,
            userId,
            displayName
          ]
        );
      } catch (err) {
        console.error('创建通知失败:', err);
        // 通知失败不影响消息发送
      }
    }

    return NextResponse.json({ success: true, message: '发送成功' });
  } catch (error: any) {
    console.error('发送消息失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
