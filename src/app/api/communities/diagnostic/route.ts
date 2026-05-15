import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// 诊断数据库字符集
export async function GET() {
  try {
    // 检查数据库字符集
    const [dbResult]: any = await pool.query('SELECT @@character_set_database as charset');
    
    // 检查表字符集
    const [tableResult]: any = await pool.query('SHOW CREATE TABLE communities');
    const tableInfo = tableResult?.[0] || {};
    
    // 获取列信息
    const [columnResult]: any = await pool.query('SHOW FULL COLUMNS FROM communities');
    
    return NextResponse.json({
      success: true,
      database_charset: dbResult?.[0]?.charset || 'unknown',
      table_create_sql: tableInfo['Create Table'] || 'unknown',
      columns: columnResult,
    });
  } catch (error: any) {
    console.error('诊断错误:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}
