import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // 尝试多个可能的路径找到 logo
    const possiblePaths = [
      path.join(process.cwd(), 'public', 'logo.jpg'),
      path.join(process.cwd(), '..', 'public', 'logo.jpg'),
      path.join(process.cwd(), '..', '..', 'public', 'logo.jpg')
    ];

    let filePath: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      // 返回一个简单的 SVG 占位图
      return new NextResponse(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
          <rect width="1200" height="630" fill="#1e3a5f"/>
          <text x="600" y="280" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#f0b429" text-anchor="middle">正道驿站</text>
          <text x="600" y="350" font-family="Arial, sans-serif" font-size="28" fill="#ffffff" text-anchor="middle">Trust Station</text>
          <text x="600" y="400" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">全球商业信任共建社区</text>
        </svg>`,
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400'
          },
        }
      );
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(buffer.length)
      },
    });
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}
