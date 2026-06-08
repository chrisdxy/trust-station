import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// 创建评论表（如果不存在）
async function ensureCommentsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS record_comments (
        id VARCHAR(36) PRIMARY KEY,
        record_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255) DEFAULT '',
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_record_id (record_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (error) {
    console.error('创建评论表失败:', error);
  }
}

// 检查用户是否有权访问记录（创建者 或 有关方 或 被授权者）
async function checkRecordAccess(recordId: string, userId: string): Promise<boolean> {
  try {
    // 1. 检查是否是记录创建者 或 有关方
    const [records]: any = await pool.query(
      `SELECT user_id, related_parties FROM records WHERE id = ?`,
      [recordId]
    );
    if (!records?.[0]) return false;
    
    if (records[0].user_id === userId) {
      return true;
    }

    // 2. 检查是否在有关方中
    if (records[0].related_parties) {
      let parties: string[] = [];
      try {
        parties = typeof records[0].related_parties === 'string' 
          ? JSON.parse(records[0].related_parties) 
          : records[0].related_parties;
      } catch { parties = []; }
      if (parties.includes(userId)) {
        return true;
      }
    }

    // 3. 检查是否有有效授权
    const [auths]: any = await pool.query(
      `SELECT id FROM authorizations 
       WHERE authorized_record_id = ? AND grantee_id = ? AND status = 'active'
       LIMIT 1`,
      [recordId, userId]
    );
    return auths?.length > 0;
  } catch (error) {
    console.error('检查记录访问权限失败:', error);
    return false;
  }
}

// 获取评论列表（仅成员可见）
export async function GET(request: NextRequest) {
  try {
    await ensureCommentsTable();
    
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');
    const userId = searchParams.get('userId');
    
    if (!recordId) {
      return NextResponse.json(
        { success: false, error: '缺少recordId参数' },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少userId参数' },
        { status: 400 }
      );
    }
    
    // 访问控制：仅记录成员可查看评论
    const hasAccess = await checkRecordAccess(recordId, userId);
    if (!hasAccess) {
      return NextResponse.json({
        success: true,
        comments: [],
        message: '仅记录成员可查看沟通内容'
      });
    }
    
    const [result]: any = await pool.query(
      `SELECT * FROM record_comments WHERE record_id = ? ORDER BY created_at ASC`,
      [recordId]
    );
    
    return NextResponse.json({
      success: true,
      comments: result || []
    });
  } catch (error) {
    console.error('获取评论失败:', error);
    return NextResponse.json(
      { success: false, error: '获取评论失败' },
      { status: 500 }
    );
  }
}

// 添加评论（仅成员可发）
export async function POST(request: NextRequest) {
  try {
    await ensureCommentsTable();
    
    const { recordId, userId, userName, content } = await request.json();
    
    if (!recordId || !userId || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 访问控制：仅记录成员可发评论
    const hasAccess = await checkRecordAccess(recordId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: '仅记录成员可参与沟通' },
        { status: 403 }
      );
    }
    
    const id = uuidv4();
    await pool.query(
      `INSERT INTO record_comments (id, record_id, user_id, user_name, content)
       VALUES (?, ?, ?, ?, ?)`,
      [id, recordId, userId, userName || '匿名用户', content.trim()]
    );
    
    // 获取刚创建的评论
    const [result]: any = await pool.query(
      `SELECT * FROM record_comments WHERE id = ?`,
      [id]
    );
    
    return NextResponse.json({
      success: true,
      comment: result?.[0] || null
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    return NextResponse.json(
      { success: false, error: '添加评论失败' },
      { status: 500 }
    );
  }
}

// 删除评论（仅作者可删自己的评论）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (!id || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 只允许删除自己的评论
    const [result]: any = await pool.query(
      `DELETE FROM record_comments WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: '评论不存在或无权删除' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除评论失败:', error);
    return NextResponse.json(
      { success: false, error: '删除评论失败' },
      { status: 500 }
    );
  }
}
