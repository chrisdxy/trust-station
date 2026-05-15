const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 读取 .env 配置
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  console.log('📝 读取配置文件:', envPath);
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ 配置文件不存在:', envPath);
    console.error('   请确认 .env 文件在项目根目录');
    process.exit(1);
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  const config = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      config[match[1].trim()] = match[2].trim();
    }
  });
  return config;
}

async function runMigration() {
  const config = loadEnv();
  
  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: parseInt(config.DB_PORT),
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });

  console.log('✅ 数据库连接成功');

  try {
    // 读取 SQL 文件
    const sqlPath = path.resolve(__dirname, 'migrate-share-tables.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // 移除注释（-- 开头的行和 /* */ 块）
    sql = sql.replace(/--[^\n]*/g, '');  // 移除 -- 注释
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');  // 移除 /* */ 注释
    
    // 分割 SQL 语句（按分号分割）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 找到 ${statements.length} 条 SQL 语句`);
    
    // 逐条执行
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        console.log(`✅ 执行成功: ${statement.substring(0, 60)}...`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  跳过（已存在）: ${statement.substring(0, 60)}...`);
        } else {
          console.error(`❌ 执行失败: ${statement.substring(0, 60)}...`);
          console.error(`   错误: ${err.message}`);
        }
      }
    }
    
    console.log('🎉 迁移完成！');
  } finally {
    await connection.end();
  }
}

runMigration().catch(err => {
  console.error('❌ 迁移失败:', err);
  process.exit(1);
});
