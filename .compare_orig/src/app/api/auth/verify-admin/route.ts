import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/lib/db';

// 验证管理员权限
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { isAdmin: false, error: '未登录' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'zhengdao-secret-key'
      ) as { userId: string; isAdmin: boolean };

      // 再次从数据库验证管理员状态（防止 token 伪造）
      const [rows]: any = await pool.query(
        'SELECT is_admin FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { isAdmin: false, error: '用户不存在' },
          { status: 401 }
        );
      }

      const isAdmin = rows[0].is_admin === 1 || rows[0].is_admin === true;

      return NextResponse.json({
        isAdmin,
        userId: decoded.userId,
      });

    } catch (jwtError) {
      return NextResponse.json(
        { isAdmin: false, error: 'Token 无效' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('验证管理员错误:', error);
    return NextResponse.json(
      { isAdmin: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
