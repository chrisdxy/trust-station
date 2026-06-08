import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: '未提供文件' }, { status: 400 });
    }

    // 限制文件类型
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const docTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-rar-compressed',
    ];
    const validTypes = [...imageTypes, ...docTypes];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|pdf|ppt|pptx|doc|docx|xls|xlsx|zip|rar)$/i)) {
      return NextResponse.json({ success: false, error: '不支持的文件类型' }, { status: 400 });
    }

    // 限制文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${uuidv4()}.${ext}`;
    const publicDir = path.join(process.cwd(), 'public', 'uploads');
    
    await mkdir(publicDir, { recursive: true });
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(publicDir, filename), buffer);

    const url = `/uploads/${filename}`;

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('上传文件错误:', error);
    return NextResponse.json({ success: false, error: '上传失败' }, { status: 500 });
  }
}
