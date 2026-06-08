/**
 * COS 对象存储工具
 * 使用内置 crypto + fetch，不依赖任何第三方 SDK
 */
import crypto from 'crypto';

const BUCKET = process.env.COS_BUCKET || 'zhengdao-1256798063';
const REGION = process.env.COS_REGION || 'ap-beijing';
const COS_HOST = `${BUCKET}.cos.${REGION}.myqcloud.com`;
export const COS_BASE_URL = `https://${COS_HOST}`;

function getSecretId() {
  return process.env.COS_SECRET_ID || '';
}

function getSecretKey() {
  return process.env.COS_SECRET_KEY || '';
}

/**
 * 生成 COS 请求签名（V5 标准）
 */
function signRequest(method: string, key: string, headers: Record<string, string> = {}) {
  const secretId = getSecretId();
  const secretKey = getSecretKey();
  if (!secretId || !secretKey) throw new Error('COS 密钥未配置');

  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now};${now + 86400}`;

  const allHeaders = { ...headers, Host: COS_HOST };
  const signedHeaders = Object.keys(allHeaders)
    .map(h => h.toLowerCase())
    .sort()
    .join(';');

  const httpString = `${method.toUpperCase()}\n/${key}\n\n${Object.entries(allHeaders)
    .map(([k, v]) => `${k.toLowerCase()}=${v}`)
    .sort()
    .join('&')}\n`;

  const signKey = crypto.createHmac('sha1', secretKey).update(keyTime).digest();
  const signature = crypto.createHmac('sha1', signKey).update(httpString).digest('hex');

  return [
    `q-sign-algorithm=sha1`,
    `q-ak=${secretId}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${signedHeaders}`,
    `q-signature=${signature}`,
  ].join('&');
}

/**
 * 上传文件到 COS
 */
export async function uploadToCOS(key: string, body: Buffer): Promise<string> {
  const contentType = getContentType(key);
  const headers = { 'Content-Type': contentType, 'Content-Length': String(body.length) };
  const auth = signRequest('PUT', key, { 'Content-Type': contentType });

  const res = await fetch(`https://${COS_HOST}/${key}`, {
    method: 'PUT',
    headers: {
      Authorization: auth,
      Host: COS_HOST,
      'Content-Type': contentType,
      'Content-Length': String(body.length),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`COS upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return `${COS_BASE_URL}/${key}`;
}

/**
 * 检查文件是否已在 COS 中
 */
export async function existsInCOS(key: string): Promise<boolean> {
  try {
    const auth = signRequest('HEAD', key);
    const res = await fetch(`https://${COS_HOST}/${key}`, {
      method: 'HEAD',
      headers: { Authorization: auth, Host: COS_HOST },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', rar: 'application/x-rar-compressed',
    mp4: 'video/mp4', heic: 'image/heic', heif: 'image/heif',
  };
  return map[ext] || 'application/octet-stream';
}
