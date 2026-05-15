import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// 获取系统配置
export async function GET() {
  try {
    const [rows]: any = await pool.query('SELECT * FROM system_config');
    
    const configs: Record<string, any> = {};
    for (const row of rows) {
      try {
        configs[row.config_key] = JSON.parse(row.config_value || '{}');
      } catch {
        configs[row.config_key] = row.config_value;
      }
    }

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error: any) {
    console.error('获取系统配置错误:', error.message);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 保存系统配置
export async function PUT(request: NextRequest) {
  try {
    const configs = await request.json();

    for (const [key, value] of Object.entries(configs)) {
      const valueStr = JSON.stringify(value);
      
      await pool.query(
        `INSERT INTO system_config (config_key, config_value) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
        [key, valueStr]
      );
    }

    return NextResponse.json({
      success: true,
      message: '配置已保存',
    });
  } catch (error: any) {
    console.error('保存系统配置错误:', error.message);
    return NextResponse.json(
      { success: false, error: '保存配置失败' },
      { status: 500 }
    );
  }
}
