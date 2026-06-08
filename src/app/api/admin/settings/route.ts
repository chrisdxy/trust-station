import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - 加载所有配置
export async function GET() {
  try {
    const [rows]: any = await pool.query('SELECT config_key, config_value FROM system_config');
    const config: Record<string, any> = {};
    for (const row of rows) {
      try {
        config[row.config_key] = JSON.parse(row.config_value);
      } catch {
        config[row.config_key] = row.config_value;
      }
    }
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - 保存配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const keys = ['general_config', 'security_config', 'smtp_config', 'sms_config', 'wechat_config', 'shumai_config'];

    for (const key of keys) {
      if (body[key] !== undefined) {
        const value = typeof body[key] === 'string' ? body[key] : JSON.stringify(body[key]);
        await pool.query(
          'INSERT INTO system_config (config_key, config_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE config_value = ?',
          [key, value, value]
        );
      }
    }

    return NextResponse.json({ success: true, message: '配置保存成功' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
