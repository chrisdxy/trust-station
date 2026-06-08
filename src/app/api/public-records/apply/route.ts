import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 申请公开维权记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, publicPersonId, publicPersonName, publicPersonPhone, recordIds, description } = body;

    if (!userId || !publicPersonId || !recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 获取选中的记录详情
    const placeholders = recordIds.map(() => '?').join(',');
    const [records]: any = await pool.query(
      `SELECT id, title, content, record_type FROM records WHERE id IN (${placeholders})`,
      recordIds
    );

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: '未找到指定记录' }, { status: 404 });
    }

    // 为每条记录创建公开申请
    const insertSql = `INSERT INTO public_records (record_id, applicant_id, public_person_id, public_person_name, public_person_phone, record_type, title, content, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`;
    
    for (const record of records) {
      await pool.query(insertSql, [
        record.id,
        userId,
        publicPersonId,
        publicPersonName || null,
        publicPersonPhone || null,
        record.record_type || '',
        record.title || '',
        record.content || '',
        description || null
      ]);
    }

    return NextResponse.json({ success: true, message: '申请已提交，等待审核', count: records.length });
  } catch (error: any) {
    console.error('申请公开失败:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
