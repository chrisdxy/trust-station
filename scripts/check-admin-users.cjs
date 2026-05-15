const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zhengdao',
  connectionLimit: 1,
});

const main = async () => {
  try {
    // 1. user_type 分布
    const [types] = await pool.query('SELECT user_type, COUNT(*) as cnt FROM users GROUP BY user_type');
    console.log('\n=== user_type 分布 ===');
    console.table(types);

    // 2. 管理员用户
    const [admins] = await pool.query("SELECT id, phone, display_name, real_name, user_type FROM users WHERE user_type = 'admin'");
    console.log('\n=== user_type=admin 的用户 ===');
    console.table(admins);

    // 3. 所有用户前10条
    const [all] = await pool.query('SELECT id, phone, display_name, user_type FROM users LIMIT 10');
    console.log('\n=== 前10条用户记录 ===');
    console.table(all);

  } catch (e) {
    console.error('错误:', e.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
};

main();
