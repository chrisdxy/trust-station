// 将 AI 工具硬编码分类写入数据库
// 运行方式：node scripts/seed-ai-categories.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const categories = [
  { name: '大语言模型', sort_order: 1 },
  { name: '图像生成',   sort_order: 2 },
  { name: '视频生成',   sort_order: 3 },
  { name: '音频处理',   sort_order: 4 },
  { name: '代码助手',   sort_order: 5 },
  { name: '数据处理',   sort_order: 6 },
  { name: '搜索与研究', sort_order: 7 },
  { name: '内容创作',   sort_order: 8 },
];

async function main() {
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT     || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'zhengdao',
    ssl: process.env.MYSQL_SSL === 'true' ? {} : undefined,
  });

  try {
    // 查重
    const [existing] = await pool.query(
      'SELECT name FROM categories WHERE type = ?',
      ['ai_tool']
    );
    const existingNames = new Set(existing.map(r => r.name));
    console.log('已有分类：', [...existingNames]);

    let added = 0;
    for (const cat of categories) {
      if (existingNames.has(cat.name)) {
        console.log(`跳过（已存在）：${cat.name}`);
        continue;
      }
      await pool.query(
        'INSERT INTO categories (type, name, sort_order, status) VALUES (?, ?, ?, ?)',
        ['ai_tool', cat.name, cat.sort_order, 'active']
      );
      console.log(`已插入：${cat.name}`);
      added++;
    }
    console.log(`\n完成！共插入 ${added} 个新分类。`);
  } catch (err) {
    console.error('错误：', err.message);
  } finally {
    await pool.end();
  }
}

main();
