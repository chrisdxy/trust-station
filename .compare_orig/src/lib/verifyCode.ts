import pool from '@/lib/db';

// Verify verification code (called by login/register modules)
export async function verifyCode(
  phone: string,
  code: string,
  type: string = 'login'
): Promise<{ valid: boolean; error?: string }> {
  try {
    const [rows]: any = await pool.query(
      'SELECT * FROM verification_codes WHERE phone = ? AND type = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
      [phone, type]
    );

    if (!rows || rows.length === 0) {
      return { valid: false, error: 'No verification code sent, please request one first' };
    }

    const record = rows[0];

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      return { valid: false, error: 'Verification code has expired, please request a new one' };
    }

    // Check if code matches
    if (record.code !== code) {
      return { valid: false, error: 'Invalid verification code' };
    }

    // Mark as used after successful verification (one-time use)
    await pool.query(
      'UPDATE verification_codes SET used = 1 WHERE id = ?',
      [record.id]
    );

    return { valid: true };
  } catch (err: any) {
    console.error('[Verification Code Check] Query failed:', err);
    return { valid: false, error: 'Verification code check failed' };
  }
}
