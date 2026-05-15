import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取已批准的工具列表
export async function GET(request: NextRequest) {
  try {
    const [result]: any = await pool.query(
      'SELECT * FROM ai_tools WHERE status = ? AND enabled = 1 ORDER BY sort_order ASC, created_at DESC',
      ['approved']
    );

    return NextResponse.json({
      success: true,
      tools: result || [],
    });
  } catch (error) {
    console.error('获取AI工具列表错误:', error);
    return NextResponse.json(
      { success: false, error: '获取列表失败' },
      { status: 500 }
    );
  }
}

// 用户提交工具申请
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, url, icon, category } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: '请提供工具名称' },
        { status: 400 }
      );
    }

    // 创建申请（待审批状态）
    await pool.query(
      `INSERT INTO ai_tools (name, description, url, icon, category, status, enabled) VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
      [name, description || '', url || '', icon || '', category || '']
    );

    return NextResponse.json({
      success: true,
      message: '提交成功，请等待审核',
    });
  } catch (error) {
    console.error('提交工具申请错误:', error);
    return NextResponse.json(
      { success: false, error: '提交失败' },
      { status: 500 }
    );
  }
}
