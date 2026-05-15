import pool from '@/lib/db';

const main = async () => {
  try {
    // 1. 查看所有 user_type 分布
    const [types]: any = await pool.query(
      'SELECT user_type, COUNT(*) as cnt FROM users GROUP BY user_type'
    );
    console.log('=== user_type 分布 ===');
    console.table(types);

    // 2. 查看管理员用户
    const [admins]: any = await pool.query(
      "SELECT id, phone, display_name, real_name, user_type FROM users WHERE user_type = 'admin'"
    );
    console.log('=== user_type=admin 的用户 ===');
    console.table(admins);

    // 3. 查看所有用户（前10条）
    const [all]: any = await pool.query(
      'SELECT id, phone, display_name, user_type FROM users LIMIT 10'
    );
    console.log('=== 前10条用户记录 ===');
    console.table(all);

  } catch (e: any) {
    console.error('错误:', e.message);
  } finally {
    process.exit(0);
  }
};

main();
